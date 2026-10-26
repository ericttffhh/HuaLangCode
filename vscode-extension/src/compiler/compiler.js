/**
 * 華語 (HuaLang) - 編譯器 (Compiler)
 * 將高階華語原始碼 (.chine) 的 AST 編譯為華語組合語言 (.casm)
 */

export class Compiler {
  constructor() {
    this.instructions = [];
    this.labelCount = 0;
  }

  compile(ast) {
    this.instructions = [];
    this.labelCount = 0;

    this.emitComment('=== 華語高階語言編譯器 (.chine -> .casm) ===');
    this.emitDirective('.資料段');
    this.emitDirective('.代碼段');
    this.emitDirective('.全域起點 _主程式入口');
    this.emitLabel('_主程式入口');

    for (const stmt of ast.body) {
      this.compileStatement(stmt);
    }

    // 程式主體結束停機
    this.emitInstruction('結束停機');
    return this.instructions.join('\n');
  }

  createLabel(prefix = '標籤') {
    return `.${prefix}_${++this.labelCount}`;
  }

  emitComment(text) {
    this.instructions.push(`; ${text}`);
  }

  emitDirective(directive) {
    this.instructions.push(directive);
  }

  emitLabel(label) {
    this.instructions.push(`${label}:`);
  }

  emitInstruction(mnemonic, ...operands) {
    const ops = operands.map(op => {
      if (mnemonic === '載入常數') {
        if (typeof op === 'string') return JSON.stringify(op);
        return String(op);
      }
      if (typeof op === 'string') {
        return op;
      }
      return JSON.stringify(op);
    }).join(', ');
    this.instructions.push(`  ${mnemonic.padEnd(8)} ${ops}`.trimEnd());
  }

  compileStatement(node) {
    if (!node) return;

    switch (node.type) {
      case 'VariableDeclaration': {
        this.emitComment(`宣告變數：${node.identifier.name}`);
        if (node.init) {
          this.compileExpression(node.init);
        } else {
          this.emitInstruction('載入常數', '空');
        }
        this.emitInstruction('存入變數', node.identifier.name);
        break;
      }

      case 'ExpressionStatement': {
        this.compileExpression(node.expression);
        break;
      }

      case 'IfStatement': {
        const elseLabel = this.createLabel('若_否則');
        const endLabel = this.createLabel('若_結束');

        this.emitComment('條件判斷');
        this.compileExpression(node.test);
        this.emitInstruction('跳躍若假', node.alternate ? elseLabel : endLabel);

        // 正向分支 (Consequent)
        this.compileBlock(node.consequent);

        if (node.alternate) {
          this.emitInstruction('跳躍', endLabel);
          this.emitLabel(elseLabel);
          if (node.alternate.type === 'IfStatement') {
            this.compileStatement(node.alternate);
          } else {
            this.compileBlock(node.alternate);
          }
        }

        this.emitLabel(endLabel);
        break;
      }

      case 'WhileStatement': {
        const startLabel = this.createLabel('當_開始');
        const endLabel = this.createLabel('當_結束');

        this.emitLabel(startLabel);
        this.compileExpression(node.test);
        this.emitInstruction('跳躍若假', endLabel);

        this.compileBlock(node.body);
        this.emitInstruction('跳躍', startLabel);
        this.emitLabel(endLabel);
        break;
      }

      case 'RangeForStatement': {
        const iterName = node.iterator.name;
        const startLabel = this.createLabel('計數_開始');
        const endLabel = this.createLabel('計數_結束');

        this.emitComment(`範圍循環：${iterName}`);
        // 初始化 iter = from
        this.compileExpression(node.from);
        this.emitInstruction('存入變數', iterName);

        this.emitLabel(startLabel);
        // 比較 iter <= to
        this.emitInstruction('載入變數', iterName);
        this.compileExpression(node.to);
        this.emitInstruction('小於等於');
        this.emitInstruction('跳躍若假', endLabel);

        // 循環體
        this.compileBlock(node.body);

        // 步長遞增 iter += step
        this.emitInstruction('載入變數', iterName);
        if (node.step) {
          this.compileExpression(node.step);
        } else {
          this.emitInstruction('載入常數', 1);
        }
        this.emitInstruction('加法');
        this.emitInstruction('存入變數', iterName);

        this.emitInstruction('跳躍', startLabel);
        this.emitLabel(endLabel);
        break;
      }

      case 'ForEachStatement': {
        const itemName = node.item.name;
        const arrVar = `__陣列_${++this.labelCount}`;
        const idxVar = `__索引_${this.labelCount}`;
        const startLabel = this.createLabel('遍歷_開始');
        const endLabel = this.createLabel('遍歷_結束');

        // 計算陣列並暫存
        this.compileExpression(node.collection);
        this.emitInstruction('存入變數', arrVar);
        this.emitInstruction('載入常數', 0);
        this.emitInstruction('存入變數', idxVar);

        this.emitLabel(startLabel);
        // idx < arr.長度
        this.emitInstruction('載入變數', idxVar);
        this.emitInstruction('載入變數', arrVar);
        this.emitInstruction('載入常數', '長度');
        this.emitInstruction('讀取成員');
        this.emitInstruction('小於');
        this.emitInstruction('跳躍若假', endLabel);

        // item = arr[idx]
        this.emitInstruction('載入變數', arrVar);
        this.emitInstruction('載入變數', idxVar);
        this.emitInstruction('讀取成員');
        this.emitInstruction('存入變數', itemName);

        this.compileBlock(node.body);

        // idx += 1
        this.emitInstruction('載入變數', idxVar);
        this.emitInstruction('載入常數', 1);
        this.emitInstruction('加法');
        this.emitInstruction('存入變數', idxVar);

        this.emitInstruction('跳躍', startLabel);
        this.emitLabel(endLabel);
        break;
      }

      case 'FunctionDeclaration': {
        const fnName = node.name.name;
        const skipLabel = this.createLabel(`跳過_${fnName}`);
        const fnLabel = `_函式_${fnName}`;

        this.emitInstruction('跳躍', skipLabel);
        this.emitLabel(fnLabel);
        this.emitDirective(`.函式簽章 ${fnName}, ${node.params.length}`);

        // 反向彈出參數存入變數
        for (let i = node.params.length - 1; i >= 0; i--) {
          this.emitInstruction('存入變數', node.params[i].name);
        }

        this.compileBlock(node.body);
        // 若未顯式回傳，預設返回空
        this.emitInstruction('載入常數', '空');
        this.emitInstruction('返回');

        this.emitLabel(skipLabel);
        this.emitInstruction('載入全域', fnLabel);
        this.emitInstruction('存入變數', fnName);
        break;
      }

      case 'ReturnStatement': {
        if (node.argument) {
          this.compileExpression(node.argument);
        } else {
          this.emitInstruction('載入常數', '空');
        }
        this.emitInstruction('返回');
        break;
      }

      case 'BlockStatement': {
        this.compileBlock(node);
        break;
      }

      default:
        this.compileExpression(node);
        break;
    }
  }

  compileBlock(blockNode) {
    if (!blockNode || !blockNode.body) return;
    for (const stmt of blockNode.body) {
      this.compileStatement(stmt);
    }
  }

  compileExpression(node) {
    if (!node) return;

    switch (node.type) {
      case 'Literal': {
        this.emitInstruction('載入常數', node.value);
        break;
      }

      case 'Identifier': {
        this.emitInstruction('載入變數', node.name);
        break;
      }

      case 'ArrayLiteral': {
        for (const el of node.elements) {
          this.compileExpression(el);
        }
        this.emitInstruction('建構陣列', node.elements.length);
        break;
      }

      case 'ObjectLiteral': {
        for (const p of node.properties) {
          this.emitInstruction('載入常數', p.key);
          this.compileExpression(p.value);
        }
        this.emitInstruction('建構字典', node.properties.length);
        break;
      }

      case 'Assignment': {
        this.compileExpression(node.right);
        if (node.left.type === 'Identifier') {
          if (node.operator === '=') {
            this.emitInstruction('存入變數', node.left.name);
          } else {
            // 如 +=, -=, *=, /=
            const opMap = { '+=': '加法', '-=': '減法', '*=': '乘法', '/=': '除法' };
            this.emitInstruction('載入變數', node.left.name);
            this.compileExpression(node.right);
            this.emitInstruction(opMap[node.operator]);
            this.emitInstruction('存入變數', node.left.name);
          }
        } else if (node.left.type === 'MemberExpression') {
          this.compileExpression(node.left.object);
          if (node.left.computed) {
            this.compileExpression(node.left.property);
          } else {
            this.emitInstruction('載入常數', node.left.property.name);
          }
          this.compileExpression(node.right);
          this.emitInstruction('寫入成員');
        }
        break;
      }

      case 'BinaryExpression': {
        this.compileExpression(node.left);
        this.compileExpression(node.right);

        const opMap = {
          '+': '加法', '-': '減法', '*': '乘法', '/': '除法', '%': '取餘', '^': '次方',
          '==': '等於', '!=': '不等於', '<': '小於', '>': '大於', '<=': '小於等於', '>=': '大於等於'
        };
        const mnem = opMap[node.operator];
        if (mnem) {
          this.emitInstruction(mnem);
        }
        break;
      }

      case 'LogicalExpression': {
        this.compileExpression(node.left);
        this.compileExpression(node.right);
        if (node.operator === '&&') this.emitInstruction('邏輯且');
        else if (node.operator === '||') this.emitInstruction('邏輯或');
        break;
      }

      case 'UnaryExpression': {
        this.compileExpression(node.argument);
        if (node.operator === '!') this.emitInstruction('邏輯非');
        else if (node.operator === '-') {
          this.emitInstruction('載入常數', 0);
          this.compileExpression(node.argument);
          this.emitInstruction('減法');
        }
        break;
      }

      case 'MemberExpression': {
        this.compileExpression(node.object);
        if (node.computed) {
          this.compileExpression(node.property);
        } else {
          this.emitInstruction('載入常數', node.property.name);
        }
        this.emitInstruction('讀取成員');
        break;
      }

      case 'CallExpression': {
        // 特殊內建呼叫優化
        if (node.callee.type === 'Identifier' && (node.callee.name === '印出' || node.callee.name === '輸出')) {
          for (const arg of node.args) {
            this.compileExpression(arg);
          }
          this.emitInstruction('印出', node.args.length);
          return;
        }

        // 一般函式或成員方法呼叫
        for (const arg of node.args) {
          this.compileExpression(arg);
        }
        this.compileExpression(node.callee);
        this.emitInstruction('呼叫', node.args.length);
        break;
      }

      default:
        break;
    }
  }
}
