/**
 * 華語 (HuaLang) - 直譯執行引擎 (Interpreter)
 * 支援環境作用域、非同步等待、步驟除錯器、與圖形/音效回饋
 */

export class ReturnValue {
  constructor(value) {
    this.value = value;
  }
}

export class BreakSignal {}
export class ContinueSignal {}

export class Environment {
  constructor(parent = null) {
    this.parent = parent;
    this.variables = new Map();
    this.constants = new Set();
  }

  define(name, value, isConstant = false) {
    this.variables.set(name, value);
    if (isConstant) {
      this.constants.add(name);
    }
  }

  assign(name, value) {
    if (this.variables.has(name)) {
      if (this.constants.has(name)) {
        throw new Error(`無法修改常數「${name}」的值`);
      }
      this.variables.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }
    throw new Error(`未宣告的變數「${name}」`);
  }

  get(name) {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    throw new Error(`未定義的變數「${name}」`);
  }

  has(name) {
    if (this.variables.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  getAllVariables() {
    const vars = {};
    if (this.parent) {
      Object.assign(vars, this.parent.getAllVariables());
    }
    for (const [key, val] of this.variables.entries()) {
      vars[key] = val;
    }
    return vars;
  }
}

export class Interpreter {
  constructor(options = {}) {
    this.onPrint = options.onPrint || console.log;
    this.onPrompt = options.onPrompt || (async (msg) => window.prompt(msg));
    this.turtle = options.turtle || null;
    this.audio = options.audio || null;
    this.globalEnv = new Environment();
    this.isAborted = false;
    this.isPaused = false;
    this.stepMode = false;
    this.stepDelay = 0; // ms
    this.onStep = options.onStep || null;

    this.initGlobalScope();
  }

  initGlobalScope() {
    const env = this.globalEnv;

    // 印出 / 輸出
    const printFn = (...args) => {
      const formatted = args.map(arg => this.formatValue(arg)).join(' ');
      this.onPrint(formatted);
      return formatted;
    };
    env.define('印出', printFn);
    env.define('輸出', printFn);

    // 輸入 (Prompt)
    env.define('輸入', async (promptText = '') => {
      return await this.onPrompt(String(promptText));
    });

    // 等待 (延遲)
    env.define('等待', async (ms = 100) => {
      await new Promise(resolve => setTimeout(resolve, Number(ms) || 0));
    });

    // 算術模組
    const mathModule = {
      圓周率: Math.PI,
      自然對數底: Math.E,
      隨機數: (min, max) => {
        if (min === undefined && max === undefined) return Math.random();
        if (max === undefined) return Math.random() * Number(min);
        return min + Math.random() * (max - min);
      },
      整數隨機數: (min, max) => {
        if (max === undefined) {
          max = min;
          min = 0;
        }
        return Math.floor(min + Math.random() * (max - min + 1));
      },
      平方根: (x) => Math.sqrt(Number(x)),
      絕對值: (x) => Math.abs(Number(x)),
      取整: (x) => Math.floor(Number(x)),
      四捨五入: (x) => Math.round(Number(x)),
      無條件進位: (x) => Math.ceil(Number(x)),
      正弦: (x) => Math.sin((Number(x) * Math.PI) / 180),
      餘弦: (x) => Math.cos((Number(x) * Math.PI) / 180),
      正切: (x) => Math.tan((Number(x) * Math.PI) / 180),
      最大值: (...args) => Math.max(...args.map(Number)),
      最小值: (...args) => Math.min(...args.map(Number)),
      次方: (a, b) => Math.pow(Number(a), Number(b))
    };
    env.define('算術', mathModule, true);

    // 字串模組
    const stringModule = {
      長度: (s) => String(s).length,
      轉數字: (s) => Number(s),
      轉字串: (s) => String(s),
      包含: (s, target) => String(s).includes(String(target)),
      取代: (s, oldStr, newStr) => String(s).replaceAll(oldStr, newStr),
      分割: (s, sep) => String(s).split(sep),
      去空白: (s) => String(s).trim(),
      大寫: (s) => String(s).toUpperCase(),
      小寫: (s) => String(s).toLowerCase(),
      截取: (s, start, length) => String(s).substr(start, length)
    };
    env.define('字串', stringModule, true);

    // 陣列模組
    const arrayModule = {
      長度: (arr) => (Array.isArray(arr) ? arr.length : 0),
      推入: (arr, ...items) => {
        if (Array.isArray(arr)) arr.push(...items);
        return arr;
      },
      彈出: (arr) => (Array.isArray(arr) ? arr.pop() : null),
      排序: (arr, compareFn) => {
        if (!Array.isArray(arr)) return arr;
        if (typeof compareFn === 'function') {
          return [...arr].sort((a, b) => compareFn(a, b));
        }
        return [...arr].sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b), 'zh-Hant');
        });
      },
      倒轉: (arr) => (Array.isArray(arr) ? [...arr].reverse() : arr),
      包含: (arr, val) => (Array.isArray(arr) ? arr.includes(val) : false),
      連接: (arr, sep = ',') => (Array.isArray(arr) ? arr.join(sep) : ''),
      切片: (arr, start, end) => (Array.isArray(arr) ? arr.slice(start, end) : [])
    };
    env.define('陣列', arrayModule, true);

    // 海龜繪圖模組
    if (this.turtle) {
      env.define('海龜', this.turtle.getAPI(), true);
      env.define('畫布', this.turtle.getAPI(), true);
    }

    // 音效模組
    if (this.audio) {
      env.define('音效', this.audio.getAPI(), true);
    }
  }

  formatValue(val) {
    if (val === null || val === undefined) return '空';
    if (val === true) return '真';
    if (val === false) return '假';
    if (typeof val === 'function') return '[函式]';
    if (Array.isArray(val)) {
      return '[' + val.map(x => this.formatValue(x)).join(', ') + ']';
    }
    if (typeof val === 'object') {
      try {
        const entries = Object.entries(val).map(([k, v]) => `${k}: ${this.formatValue(v)}`);
        return '{ ' + entries.join(', ') + ' }';
      } catch {
        return '[物件]';
      }
    }
    return String(val);
  }

  abort() {
    this.isAborted = true;
  }

  async run(ast) {
    this.isAborted = false;
    try {
      return await this.execute(ast, this.globalEnv);
    } catch (err) {
      if (err instanceof ReturnValue) return err.value;
      throw err;
    }
  }

  async stepNotify(node, env) {
    if (this.isAborted) {
      throw new Error('程式已由使用者手動終止');
    }

    if (this.onStep && node && node.line > 0) {
      await this.onStep({
        line: node.line,
        column: node.column,
        nodeType: node.type,
        scope: env.getAllVariables()
      });
    }

    if (this.stepDelay > 0) {
      await new Promise(r => setTimeout(r, this.stepDelay));
    }
  }

  async execute(node, env) {
    if (!node) return null;
    if (this.isAborted) throw new Error('程式已由使用者手動終止');

    switch (node.type) {
      case 'Program': {
        let result = null;
        for (const stmt of node.body) {
          result = await this.execute(stmt, env);
        }
        return result;
      }

      case 'BlockStatement': {
        const blockEnv = new Environment(env);
        let result = null;
        for (const stmt of node.body) {
          result = await this.execute(stmt, blockEnv);
        }
        return result;
      }

      case 'VariableDeclaration': {
        await this.stepNotify(node, env);
        let val = null;
        if (node.init) {
          val = await this.evaluate(node.init, env);
        }
        env.define(node.identifier.name, val, node.kind === '常數');
        return val;
      }

      case 'ExpressionStatement': {
        await this.stepNotify(node, env);
        return await this.evaluate(node.expression, env);
      }

      case 'IfStatement': {
        await this.stepNotify(node, env);
        const cond = await this.evaluate(node.test, env);
        if (this.isTruthy(cond)) {
          return await this.execute(node.consequent, env);
        } else if (node.alternate) {
          return await this.execute(node.alternate, env);
        }
        return null;
      }

      case 'WhileStatement': {
        let result = null;
        while (this.isTruthy(await this.evaluate(node.test, env))) {
          await this.stepNotify(node, env);
          try {
            result = await this.execute(node.body, env);
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (e instanceof ContinueSignal) continue;
            throw e;
          }
        }
        return result;
      }

      case 'RangeForStatement': {
        await this.stepNotify(node, env);
        const fromVal = Number(await this.evaluate(node.from, env));
        const toVal = Number(await this.evaluate(node.to, env));
        let stepVal = 1;
        if (node.step) {
          stepVal = Number(await this.evaluate(node.step, env));
        } else if (fromVal > toVal) {
          stepVal = -1;
        }

        const loopEnv = new Environment(env);
        const iterName = node.iterator.name;

        let result = null;
        if (stepVal > 0) {
          for (let i = fromVal; i <= toVal; i += stepVal) {
            loopEnv.define(iterName, i);
            await this.stepNotify(node, loopEnv);
            try {
              result = await this.execute(node.body, loopEnv);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          }
        } else {
          for (let i = fromVal; i >= toVal; i += stepVal) {
            loopEnv.define(iterName, i);
            await this.stepNotify(node, loopEnv);
            try {
              result = await this.execute(node.body, loopEnv);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) continue;
              throw e;
            }
          }
        }
        return result;
      }

      case 'ForEachStatement': {
        await this.stepNotify(node, env);
        const collection = await this.evaluate(node.collection, env);
        if (!Array.isArray(collection) && typeof collection !== 'string') {
          throw new Error(`第 ${node.line} 行：遍歷的目標必須是陣列或字串`);
        }

        const loopEnv = new Environment(env);
        const itemName = node.item.name;
        let result = null;

        for (const elem of collection) {
          loopEnv.define(itemName, elem);
          await this.stepNotify(node, loopEnv);
          try {
            result = await this.execute(node.body, loopEnv);
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (e instanceof ContinueSignal) continue;
            throw e;
          }
        }
        return result;
      }

      case 'FunctionDeclaration': {
        await this.stepNotify(node, env);
        const funcName = node.name.name;
        const fn = async (...args) => {
          const fnEnv = new Environment(env); // 閉包繼承
          node.params.forEach((param, idx) => {
            fnEnv.define(param.name, args[idx] !== undefined ? args[idx] : null);
          });
          try {
            await this.execute(node.body, fnEnv);
          } catch (e) {
            if (e instanceof ReturnValue) return e.value;
            throw e;
          }
          return null;
        };
        env.define(funcName, fn);
        return fn;
      }

      case 'ReturnStatement': {
        await this.stepNotify(node, env);
        const val = node.argument ? await this.evaluate(node.argument, env) : null;
        throw new ReturnValue(val);
      }

      case 'BreakStatement': {
        await this.stepNotify(node, env);
        throw new BreakSignal();
      }

      case 'ContinueStatement': {
        await this.stepNotify(node, env);
        throw new ContinueSignal();
      }

      default:
        return await this.evaluate(node, env);
    }
  }

  async evaluate(node, env) {
    if (!node) return null;
    if (this.isAborted) throw new Error('程式已由使用者手動終止');

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier':
        return env.get(node.name);

      case 'ArrayLiteral': {
        const arr = [];
        for (const elem of node.elements) {
          arr.push(await this.evaluate(elem, env));
        }
        return arr;
      }

      case 'ObjectLiteral': {
        const obj = {};
        for (const prop of node.properties) {
          obj[prop.key] = await this.evaluate(prop.value, env);
        }
        return obj;
      }

      case 'Assignment': {
        const rightVal = await this.evaluate(node.right, env);
        let finalVal = rightVal;

        if (node.operator !== '=') {
          let currentVal;
          if (node.left.type === 'Identifier') {
            currentVal = env.get(node.left.name);
          } else if (node.left.type === 'MemberExpression') {
            const targetObj = await this.evaluate(node.left.object, env);
            const propName = node.left.computed
              ? await this.evaluate(node.left.property, env)
              : node.left.property.name;
            currentVal = targetObj[propName];
          }

          if (node.operator === '+=') finalVal = currentVal + rightVal;
          else if (node.operator === '-=') finalVal = currentVal - rightVal;
          else if (node.operator === '*=') finalVal = currentVal * rightVal;
          else if (node.operator === '/=') finalVal = currentVal / rightVal;
        }

        if (node.left.type === 'Identifier') {
          env.assign(node.left.name, finalVal);
        } else if (node.left.type === 'MemberExpression') {
          const targetObj = await this.evaluate(node.left.object, env);
          const propName = node.left.computed
            ? await this.evaluate(node.left.property, env)
            : node.left.property.name;
          targetObj[propName] = finalVal;
        }
        return finalVal;
      }

      case 'BinaryExpression': {
        const leftVal = await this.evaluate(node.left, env);
        const rightVal = await this.evaluate(node.right, env);

        switch (node.operator) {
          case '+': return leftVal + rightVal;
          case '-': return Number(leftVal) - Number(rightVal);
          case '*': return Number(leftVal) * Number(rightVal);
          case '/':
            if (Number(rightVal) === 0) throw new Error(`第 ${node.line} 行：除數不可為零`);
            return Number(leftVal) / Number(rightVal);
          case '%': return Number(leftVal) % Number(rightVal);
          case '^': return Math.pow(Number(leftVal), Number(rightVal));
          case '==': return leftVal === rightVal;
          case '!=': return leftVal !== rightVal;
          case '<': return leftVal < rightVal;
          case '>': return leftVal > rightVal;
          case '<=': return leftVal <= rightVal;
          case '>=': return leftVal >= rightVal;
          default:
            throw new Error(`未知的二元運算子「${node.operator}」`);
        }
      }

      case 'LogicalExpression': {
        const leftVal = await this.evaluate(node.left, env);
        if (node.operator === '&&') {
          if (!this.isTruthy(leftVal)) return leftVal;
          return await this.evaluate(node.right, env);
        } else if (node.operator === '||') {
          if (this.isTruthy(leftVal)) return leftVal;
          return await this.evaluate(node.right, env);
        }
        return false;
      }

      case 'UnaryExpression': {
        const val = await this.evaluate(node.argument, env);
        if (node.operator === '!') return !this.isTruthy(val);
        if (node.operator === '-') return -Number(val);
        if (node.operator === '+') return +Number(val);
        throw new Error(`未知的一元運算子「${node.operator}」`);
      }

      case 'MemberExpression': {
        const targetObj = await this.evaluate(node.object, env);
        if (targetObj === null || targetObj === undefined) {
          throw new Error(`第 ${node.line} 行：無法在空值上存取屬性`);
        }

        let propName;
        if (node.computed) {
          propName = await this.evaluate(node.property, env);
        } else {
          propName = node.property.name;
        }

        // 支援陣列長度與字串長度原生別名
        if (propName === '長度') {
          return targetObj.length;
        }

        const propValue = targetObj[propName];
        if (typeof propValue === 'function') {
          return propValue.bind(targetObj);
        }
        return propValue;
      }

      case 'CallExpression': {
        const callee = await this.evaluate(node.callee, env);
        if (typeof callee !== 'function') {
          throw new Error(`第 ${node.line} 行：「${node.callee.name || '表達式'}」不是可調用的函式`);
        }
        const evaluatedArgs = [];
        for (const arg of node.args) {
          evaluatedArgs.push(await this.evaluate(arg, env));
        }
        return await callee(...evaluatedArgs);
      }

      default:
        throw new Error(`未支援的語法節點型別「${node.type}」`);
    }
  }

  isTruthy(val) {
    if (val === false || val === null || val === undefined || val === 0 || val === '') {
      return false;
    }
    return true;
  }
}
