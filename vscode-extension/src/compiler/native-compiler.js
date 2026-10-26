/**
 * 華語 (HuaLang / .chine) - 真實原生 ARM64 組合語言編譯器 (Native ARM64 Compiler)
 * 將 .chine 原始碼直接編譯為真實電腦 CPU 可識別的 ARM64 組合語言 (.s)，
 * 並透過原生組譯器 (Assembler) 與連結器 (Linker) 生成真正的二進位機器語言執行檔！
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class NativeARM64Compiler {
  constructor() {
    this.stringLiterals = [];
    this.labelCounter = 0;
    this.variableMap = new Map(); // 變數名 -> 堆疊位移 (offset from fp)
    this.currentStackOffset = 16;
  }

  createLabel(prefix = 'L') {
    return `L_${prefix}_${++this.labelCounter}`;
  }

  addStringLiteral(str) {
    const existing = this.stringLiterals.find(s => s.value === str);
    if (existing) return existing.label;
    const label = `_str_${this.stringLiterals.length}`;
    this.stringLiterals.push({ label, value: str });
    return label;
  }

  compileToAssembly(ast) {
    this.stringLiterals = [];
    this.labelCounter = 0;
    this.variableMap = new Map();
    this.currentStackOffset = 16;

    const bodyLines = [];

    // 預先註冊標準印出格式字串
    this.addStringLiteral('%lld');
    this.addStringLiteral('%s');
    this.addStringLiteral('\n');
    this.addStringLiteral(' ');

    for (const stmt of ast.body) {
      bodyLines.push(...this.compileStatement(stmt));
    }

    // 計算局部變數所需堆疊大小 (需 16 位元組對齊)
    const rawStackSize = this.currentStackOffset + 32;
    const alignedStackSize = Math.ceil(rawStackSize / 16) * 16;

    const asm = [
      '// =========================================================================',
      '// 由 華語 (.chine) 獨立高階語言編譯器 生成之原生 ARM64 (AArch64) 組合語言',
      '// 目標架構：Apple Silicon (Darwin ARM64 / macOS / Linux)',
      '// =========================================================================',
      '',
      '.global _main',
      '.p2align 2',
      '',
      '.data',
      '// 常數資料段 (Data Segment)'
    ];

    for (const item of this.stringLiterals) {
      const escaped = JSON.stringify(item.value).slice(1, -1);
      asm.push(`${item.label}:`);
      asm.push(`    .asciz "${escaped}"`);
    }

    asm.push(
      '',
      '.text',
      '// 代碼段 (Code Segment)',
      '_main:',
      '    // 函式序幕 (Prologue): 保存幀指標 (FP) 與返回位址 (LR)',
      '    stp     fp, lr, [sp, -16]!',
      '    mov     fp, sp',
      `    sub     sp, sp, #${alignedStackSize} // 為局部變數分配堆疊空間`,
      ''
    );

    asm.push(...bodyLines);

    asm.push(
      '',
      '    // 函式尾聲 (Epilogue): 復原堆疊並正常退出 (回傳值 0)',
      '    mov     w0, #0',
      `    add     sp, sp, #${alignedStackSize}`,
      '    ldp     fp, lr, [sp], #16',
      '    ret',
      ''
    );

    return asm.join('\n');
  }

  compileStatement(node) {
    if (!node) return [];
    const lines = [];

    switch (node.type) {
      case 'VariableDeclaration': {
        const varName = node.identifier.name;
        if (!this.variableMap.has(varName)) {
          this.variableMap.set(varName, this.currentStackOffset);
          this.currentStackOffset += 8;
        }
        const offset = this.variableMap.get(varName);

        lines.push(`    // 宣告變數：${varName}`);
        if (node.init) {
          lines.push(...this.compileExpression(node.init)); // 結果置於 x0
        } else {
          lines.push('    mov     x0, #0');
        }
        lines.push(`    str     x0, [fp, #-16] // 暫存運算`);
        lines.push(`    str     x0, [fp, #${-offset}] // 存入變數 ${varName}`);
        break;
      }

      case 'ExpressionStatement': {
        lines.push(...this.compileExpression(node.expression));
        break;
      }

      case 'IfStatement': {
        const elseLabel = this.createLabel('if_else');
        const endLabel = this.createLabel('if_end');

        lines.push('    // 條件判斷式');
        lines.push(...this.compileExpression(node.test));
        lines.push('    cmp     x0, #0');
        lines.push(`    b.eq    ${node.alternate ? elseLabel : endLabel}`);

        // 分支 Consequent
        lines.push(...this.compileBlock(node.consequent));

        if (node.alternate) {
          lines.push(`    b       ${endLabel}`);
          lines.push(`${elseLabel}:`);
          if (node.alternate.type === 'IfStatement') {
            lines.push(...this.compileStatement(node.alternate));
          } else {
            lines.push(...this.compileBlock(node.alternate));
          }
        }

        lines.push(`${endLabel}:`);
        break;
      }

      case 'WhileStatement': {
        const startLabel = this.createLabel('while_start');
        const endLabel = this.createLabel('while_end');

        lines.push(`${startLabel}:`);
        lines.push(...this.compileExpression(node.test));
        lines.push('    cmp     x0, #0');
        lines.push(`    b.eq    ${endLabel}`);

        lines.push(...this.compileBlock(node.body));
        lines.push(`    b       ${startLabel}`);
        lines.push(`${endLabel}:`);
        break;
      }

      case 'RangeForStatement': {
        const iterName = node.iterator.name;
        if (!this.variableMap.has(iterName)) {
          this.variableMap.set(iterName, this.currentStackOffset);
          this.currentStackOffset += 8;
        }
        const iterOffset = this.variableMap.get(iterName);
        const startLabel = this.createLabel('for_start');
        const endLabel = this.createLabel('for_end');

        lines.push(`    // 範圍循環：${iterName}`);
        lines.push(...this.compileExpression(node.from));
        lines.push(`    str     x0, [fp, #${-iterOffset}]`);

        lines.push(`${startLabel}:`);
        lines.push(`    ldr     x0, [fp, #${-iterOffset}]`);
        lines.push('    str     x0, [sp, #-16]!');
        lines.push(...this.compileExpression(node.to));
        lines.push('    mov     x1, x0');
        lines.push('    ldr     x0, [sp], #16');
        lines.push('    cmp     x0, x1');
        lines.push(`    b.gt    ${endLabel}`);

        lines.push(...this.compileBlock(node.body));

        // 步長遞增
        lines.push(`    ldr     x0, [fp, #${-iterOffset}]`);
        lines.push('    add     x0, x0, #1');
        lines.push(`    str     x0, [fp, #${-iterOffset}]`);
        lines.push(`    b       ${startLabel}`);
        lines.push(`${endLabel}:`);
        break;
      }

      default:
        lines.push(...this.compileExpression(node));
        break;
    }

    return lines;
  }

  compileBlock(blockNode) {
    if (!blockNode || !blockNode.body) return [];
    const lines = [];
    for (const stmt of blockNode.body) {
      lines.push(...this.compileStatement(stmt));
    }
    return lines;
  }

  compileExpression(node) {
    if (!node) return [];
    const lines = [];

    switch (node.type) {
      case 'Literal': {
        if (typeof node.value === 'number') {
          lines.push(`    mov     x0, #${node.value}`);
        } else if (typeof node.value === 'boolean') {
          lines.push(`    mov     x0, #${node.value ? 1 : 0}`);
        } else if (typeof node.value === 'string') {
          const strLabel = this.addStringLiteral(node.value);
          lines.push(`    adrp    x0, ${strLabel}@PAGE`);
          lines.push(`    add     x0, x0, ${strLabel}@PAGEOFF`);
        } else {
          lines.push('    mov     x0, #0');
        }
        break;
      }

      case 'Identifier': {
        if (this.variableMap.has(node.name)) {
          const offset = this.variableMap.get(node.name);
          lines.push(`    ldr     x0, [fp, #${-offset}] // 載入變數 ${node.name}`);
        } else {
          lines.push('    mov     x0, #0');
        }
        break;
      }

      case 'Assignment': {
        lines.push(...this.compileExpression(node.right));
        if (node.left.type === 'Identifier') {
          const varName = node.left.name;
          if (!this.variableMap.has(varName)) {
            this.variableMap.set(varName, this.currentStackOffset);
            this.currentStackOffset += 8;
          }
          const offset = this.variableMap.get(varName);

          if (node.operator === '=') {
            lines.push(`    str     x0, [fp, #${-offset}] // 賦值給 ${varName}`);
          } else {
            lines.push('    str     x0, [sp, #-16]!');
            lines.push(`    ldr     x0, [fp, #${-offset}]`);
            lines.push('    ldr     x1, [sp], #16');
            if (node.operator === '+=') lines.push('    add     x0, x0, x1');
            else if (node.operator === '-=') lines.push('    sub     x0, x0, x1');
            else if (node.operator === '*=') lines.push('    mul     x0, x0, x1');
            else if (node.operator === '/=') lines.push('    sdiv    x0, x0, x1');
            lines.push(`    str     x0, [fp, #${-offset}]`);
          }
        }
        break;
      }

      case 'BinaryExpression': {
        lines.push(...this.compileExpression(node.left));
        lines.push('    str     x0, [sp, #-16]!');
        lines.push(...this.compileExpression(node.right));
        lines.push('    mov     x1, x0');
        lines.push('    ldr     x0, [sp], #16');

        switch (node.operator) {
          case '+':
            lines.push('    add     x0, x0, x1');
            break;
          case '-':
            lines.push('    sub     x0, x0, x1');
            break;
          case '*':
            lines.push('    mul     x0, x0, x1');
            break;
          case '/':
            lines.push('    sdiv    x0, x0, x1');
            break;
          case '%':
            lines.push('    sdiv    x2, x0, x1');
            lines.push('    msub    x0, x2, x1, x0');
            break;
          case '==':
            lines.push('    cmp     x0, x1');
            lines.push('    cset    x0, eq');
            break;
          case '!=':
            lines.push('    cmp     x0, x1');
            lines.push('    cset    x0, ne');
            break;
          case '<':
            lines.push('    cmp     x0, x1');
            lines.push('    cset    x0, lt');
            break;
          case '>':
            lines.push('    cmp     x0, x1');
            lines.push('    cset    x0, gt');
            break;
          case '<=':
            lines.push('    cmp     x0, x1');
            lines.push('    cset    x0, le');
            break;
          case '>=':
            lines.push('    cmp     x0, x1');
            lines.push('    cset    x0, ge');
            break;
        }
        break;
      }

      case 'CallExpression': {
        if (node.callee.type === 'Identifier' && (node.callee.name === '印出' || node.callee.name === '輸出')) {
          lines.push('    // 內建指令：印出 (調用原生 printf)');
          for (let i = 0; i < node.args.length; i++) {
            const arg = node.args[i];
            lines.push(...this.compileExpression(arg));
            lines.push('    mov     x1, x0');

            // 判斷參數型別
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              lines.push('    adrp    x0, _str_1@PAGE // %s');
              lines.push('    add     x0, x0, _str_1@PAGEOFF');
            } else {
              lines.push('    adrp    x0, _str_0@PAGE // %lld');
              lines.push('    add     x0, x0, _str_0@PAGEOFF');
            }
            lines.push('    bl      _printf');

            // 參數間空格
            if (i < node.args.length - 1) {
              lines.push('    adrp    x0, _str_3@PAGE // 空格');
              lines.push('    add     x0, x0, _str_3@PAGEOFF');
              lines.push('    bl      _printf');
            }
          }
          // 換行
          lines.push('    adrp    x0, _str_2@PAGE // 換行');
          lines.push('    add     x0, x0, _str_2@PAGEOFF');
          lines.push('    bl      _printf');
        }
        break;
      }

      default:
        break;
    }

    return lines;
  }

  /**
   * 使用本機 Apple clang / as / ld 將生成的 ARM64 組合語言組譯並連結為真實二進位執行檔！
   */
  assembleAndLinkNative(asmCode, outputBinaryPath) {
    const tempAsmPath = outputBinaryPath + '.s';
    fs.writeFileSync(tempAsmPath, asmCode, 'utf-8');

    try {
      // 調用 Apple clang 直接組譯與連結為 Mach-O 64-bit 機器碼執行檔
      execSync(`clang -arch arm64 "${tempAsmPath}" -o "${outputBinaryPath}"`, { stdio: 'pipe' });
      return { success: true, binaryPath: outputBinaryPath, asmPath: tempAsmPath };
    } catch (err) {
      throw new Error(`原生組譯/連結失敗：${err.stderr ? err.stderr.toString() : err.message}`);
    }
  }

  /**
   * 直接執行原生機器碼執行檔並取得輸出
   */
  runNativeBinary(binaryPath) {
    try {
      const stdout = execSync(`"${binaryPath}"`, { stdio: 'pipe', encoding: 'utf-8' });
      return stdout;
    } catch (err) {
      throw new Error(`原生執行失敗：${err.stderr ? err.stderr.toString() : err.message}`);
    }
  }
}
