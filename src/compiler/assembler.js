/**
 * 華語 (HuaLang) - 組譯器 (Assembler)
 * 將華語組合語言 (.casm) 組譯為可重定位目標檔 (.cobj / Chinese Object File)
 */

import { Opcode, MNEMONIC_MAP } from './isa.js';

export class Assembler {
  constructor() {
    this.constantPool = [];
    this.symbolTable = {}; // 符號名 -> { offset, type, exported }
    this.relocations = []; // 需要連結器或重定位解析的條目
    this.instructions = []; // 字節碼指令列表
  }

  getConstantIndex(value) {
    // 檢查常數池是否已存在
    const idx = this.constantPool.findIndex(c => c === value);
    if (idx !== -1) return idx;
    this.constantPool.push(value);
    return this.constantPool.length - 1;
  }

  assemble(casmSource) {
    this.constantPool = [];
    this.symbolTable = {};
    this.relocations = [];
    this.instructions = [];

    const lines = casmSource.split('\n');

    // 第一階段 (Pass 1)：收集所有標籤與指示詞，記錄符號位址
    let currentIP = 0;
    const pendingInstructions = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let rawLine = lines[lineIndex].trim();
      // 移除註解
      const commentIdx = rawLine.indexOf(';');
      if (commentIdx !== -1) {
        rawLine = rawLine.slice(0, commentIdx).trim();
      }
      if (!rawLine) continue;

      // 檢查指示詞
      if (rawLine.startsWith('.')) {
        if (rawLine.startsWith('.全域起點')) {
          const entrySym = rawLine.split(/\s+/)[1];
          this.symbolTable[entrySym] = { offset: currentIP, type: 'ENTRY', exported: true };
          continue;
        }
        if (rawLine.startsWith('.函式簽章')) {
          const parts = rawLine.slice(5).trim().split(',');
          const fnName = parts[0]?.trim();
          const paramCount = parseInt(parts[1]?.trim() || '0', 10);
          this.symbolTable[`_函式_${fnName}`] = {
            offset: currentIP,
            type: 'FUNCTION',
            params: paramCount,
            exported: true
          };
          continue;
        }
        if (rawLine.startsWith('.代碼段') || rawLine.startsWith('.資料段')) {
          continue;
        }
      }

      // 檢查標籤定義 (例如 `.標籤_若_1:` 或 `_主程式入口:`)
      if (rawLine.endsWith(':')) {
        const labelName = rawLine.slice(0, -1).trim();
        this.symbolTable[labelName] = { offset: currentIP, type: 'LABEL', exported: false };
        continue;
      }

      // 指令與運算元解析
      const parts = rawLine.split(/\s+/);
      const mnemonic = parts[0];
      const operandStr = rawLine.slice(mnemonic.length).trim();

      const opcode = MNEMONIC_MAP[mnemonic];
      if (opcode === undefined) {
        throw new Error(`第 ${lineIndex + 1} 行：未知的組語指令「${mnemonic}」`);
      }

      pendingInstructions.push({
        ip: currentIP,
        mnemonic,
        opcode,
        operandStr,
        lineIndex: lineIndex + 1
      });
      currentIP++;
    }

    // 第二階段 (Pass 2)：產生字節碼與重定位表
    for (const item of pendingInstructions) {
      let operand = null;

      if (item.operandStr) {
        const rawOp = item.operandStr;

        // 若是常數指令
        if (item.mnemonic === '載入常數') {
          let parsedVal;
          if (rawOp === '空') parsedVal = null;
          else if (rawOp === '真') parsedVal = true;
          else if (rawOp === '假') parsedVal = false;
          else if (!isNaN(Number(rawOp))) parsedVal = Number(rawOp);
          else if (rawOp.startsWith('"') && rawOp.endsWith('"')) parsedVal = JSON.parse(rawOp);
          else parsedVal = rawOp;

          operand = this.getConstantIndex(parsedVal);
        }
        // 若是跳躍標籤符號
        else if (rawOp.startsWith('.') || rawOp.startsWith('_')) {
          if (this.symbolTable[rawOp] !== undefined) {
            operand = this.symbolTable[rawOp].offset;
          } else {
            // 外部符號或未決標籤，記錄至重定位表
            this.relocations.push({
              ip: item.ip,
              symbol: rawOp,
              type: 'SYMBOL_OFFSET'
            });
            operand = 0; // 暫時填入 0
          }
        }
        // 若是變數識別名 (存入變數 / 載入變數)
        else if (item.mnemonic === '存入變數' || item.mnemonic === '載入變數' || item.mnemonic === '載入全域') {
          operand = this.getConstantIndex(rawOp);
        }
        // 數字運算元 (如 參數個數、元素個數)
        else if (!isNaN(Number(rawOp))) {
          operand = Number(rawOp);
        } else {
          operand = this.getConstantIndex(rawOp);
        }
      }

      this.instructions.push({
        ip: item.ip,
        opcode: item.opcode,
        operand: operand
      });
    }

    // 建立可重定位目標檔 (.cobj) 結構
    const objectFile = {
      magic: 'CHINEOBJ',
      version: '1.0.0',
      timestamp: Date.now(),
      constantPool: this.constantPool,
      symbolTable: this.symbolTable,
      relocations: this.relocations,
      codeSegment: this.instructions
    };

    return objectFile;
  }
}
