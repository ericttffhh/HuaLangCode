/**
 * 華語 (HuaLang) - JavaScript 轉譯器 (Transpiler)
 * 將華語語法樹轉換為乾淨現代的 JavaScript 程式碼
 */

export class Transpiler {
  constructor() {
    this.indent = 0;
  }

  transpile(ast) {
    this.indent = 0;
    return this.generate(ast);
  }

  getIndent() {
    return '  '.repeat(this.indent);
  }

  generate(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program': {
        const lines = [
          '// ===== 由「華語 (HuaLang)」自動轉譯為 JavaScript =====',
          ''
        ];
        for (const stmt of node.body) {
          lines.push(this.generate(stmt));
        }
        return lines.join('\n');
      }

      case 'BlockStatement': {
        const lines = ['{'];
        this.indent++;
        for (const stmt of node.body) {
          lines.push(this.getIndent() + this.generate(stmt));
        }
        this.indent--;
        lines.push(this.getIndent() + '}');
        return lines.join('\n');
      }

      case 'VariableDeclaration': {
        const keyword = node.kind === '常數' ? 'const' : 'let';
        const init = node.init ? ` = ${this.generate(node.init)}` : '';
        return `${keyword} ${node.identifier.name}${init};`;
      }

      case 'ExpressionStatement': {
        return `${this.generate(node.expression)};`;
      }

      case 'IfStatement': {
        let code = `if (${this.generate(node.test)}) ${this.generate(node.consequent)}`;
        if (node.alternate) {
          if (node.alternate.type === 'IfStatement') {
            code += ` else ${this.generate(node.alternate)}`;
          } else {
            code += ` else ${this.generate(node.alternate)}`;
          }
        }
        return code;
      }

      case 'WhileStatement': {
        return `while (${this.generate(node.test)}) ${this.generate(node.body)}`;
      }

      case 'RangeForStatement': {
        const iter = node.iterator.name;
        const from = this.generate(node.from);
        const to = this.generate(node.to);
        const step = node.step ? this.generate(node.step) : '1';
        return `for (let ${iter} = ${from}; ${iter} <= ${to}; ${iter} += ${step}) ${this.generate(node.body)}`;
      }

      case 'ForEachStatement': {
        const item = node.item.name;
        const col = this.generate(node.collection);
        return `for (const ${item} of ${col}) ${this.generate(node.body)}`;
      }

      case 'FunctionDeclaration': {
        const name = node.name.name;
        const params = node.params.map(p => p.name).join(', ');
        return `function ${name}(${params}) ${this.generate(node.body)}`;
      }

      case 'ReturnStatement': {
        const arg = node.argument ? ` ${this.generate(node.argument)}` : '';
        return `return${arg};`;
      }

      case 'BreakStatement': {
        return 'break;';
      }

      case 'ContinueStatement': {
        return 'continue;';
      }

      case 'Literal': {
        if (typeof node.value === 'string') {
          return JSON.stringify(node.value);
        }
        if (node.value === null) return 'null';
        if (node.value === true) return 'true';
        if (node.value === false) return 'false';
        return String(node.value);
      }

      case 'Identifier': {
        return node.name;
      }

      case 'Assignment': {
        return `${this.generate(node.left)} ${node.operator} ${this.generate(node.right)}`;
      }

      case 'BinaryExpression': {
        let op = node.operator;
        if (op === '^') {
          return `Math.pow(${this.generate(node.left)}, ${this.generate(node.right)})`;
        }
        return `(${this.generate(node.left)} ${op} ${this.generate(node.right)})`;
      }

      case 'LogicalExpression': {
        return `(${this.generate(node.left)} ${node.operator} ${this.generate(node.right)})`;
      }

      case 'UnaryExpression': {
        return `${node.operator}${this.generate(node.argument)}`;
      }

      case 'MemberExpression': {
        const obj = this.generate(node.object);
        if (node.computed) {
          return `${obj}[${this.generate(node.property)}]`;
        }
        return `${obj}.${node.property.name}`;
      }

      case 'CallExpression': {
        const callee = this.generate(node.callee);
        const args = node.args.map(a => this.generate(a)).join(', ');
        return `${callee}(${args})`;
      }

      case 'ArrayLiteral': {
        return `[${node.elements.map(e => this.generate(e)).join(', ')}]`;
      }

      case 'ObjectLiteral': {
        const props = node.properties.map(p => `${JSON.stringify(p.key)}: ${this.generate(p.value)}`);
        return `{ ${props.join(', ')} }`;
      }

      default:
        return `/* 未知節點: ${node.type} */`;
    }
  }
}
