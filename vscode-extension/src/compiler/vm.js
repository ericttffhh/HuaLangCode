/**
 * 華語 (HuaLang) - HuaVM 堆疊型虛擬機 (Virtual Machine)
 * 載入並執行經由編譯器、組譯器與連結器生成的 .cbinary 可執行二進位檔
 */

import { Opcode, OPCODE_NAME_MAP } from './isa.js';

export class HuaVM {
  constructor(options = {}) {
    this.onPrint = options.onPrint || console.log;
    this.onPrompt = options.onPrompt || (async (msg) => window.prompt(msg));
    this.turtle = options.turtle || null;
    this.audio = options.audio || null;
    this.onVMStep = options.onVMStep || null;
    this.stepDelay = 0;
    this.isHalted = false;
    this.isAborted = false;

    // 虛擬機核心架構
    this.ip = 0;
    this.stack = [];
    this.callStack = [];
    this.globals = new Map();
    this.locals = new Map();

    this.initBuiltins();
  }

  initBuiltins() {
    // 算術
    const mathMod = {
      圓周率: Math.PI,
      隨機數: (min, max) => {
        if (min === undefined && max === undefined) return Math.random();
        if (max === undefined) return Math.random() * Number(min);
        return min + Math.random() * (max - min);
      },
      整數隨機數: (min, max) => {
        if (max === undefined) { max = min; min = 0; }
        return Math.floor(min + Math.random() * (max - min + 1));
      },
      平方根: (x) => Math.sqrt(Number(x)),
      絕對值: (x) => Math.abs(Number(x)),
      四捨五入: (x) => Math.round(Number(x))
    };
    this.globals.set('算術', mathMod);

    // 字串
    const strMod = {
      長度: (s) => String(s).length,
      轉數字: (s) => Number(s),
      轉字串: (s) => String(s),
      包含: (s, t) => String(s).includes(String(t))
    };
    this.globals.set('字串', strMod);

    // 陣列
    const arrMod = {
      長度: (a) => (Array.isArray(a) ? a.length : 0),
      推入: (a, ...items) => { if (Array.isArray(a)) a.push(...items); return a; },
      彈出: (a) => (Array.isArray(a) ? a.pop() : null)
    };
    this.globals.set('陣列', arrMod);

    if (this.turtle) {
      this.globals.set('海龜', this.turtle.getAPI());
      this.globals.set('畫布', this.turtle.getAPI());
    }

    if (this.audio) {
      this.globals.set('音效', this.audio.getAPI());
    }

    this.globals.set('輸入', async (msg) => await this.onPrompt(String(msg)));
    this.globals.set('等待', async (ms) => await new Promise(r => setTimeout(r, Number(ms) || 0)));
  }

  abort() {
    this.isAborted = true;
    this.isHalted = true;
  }

  async run(executable) {
    if (!executable || executable.magic !== 'CHINEXEC') {
      throw new Error('執行檔無效：缺少正確的華語可執行檔魔數標頭 (Magic: CHINEXEC)');
    }

    this.isHalted = false;
    this.isAborted = false;
    this.stack = [];
    this.callStack = [];
    this.locals = new Map();
    this.ip = executable.entryPoint || 0;

    const instructions = executable.instructions;
    const constantPool = executable.constantPool;

    while (this.ip < instructions.length && !this.isHalted) {
      if (this.isAborted) {
        throw new Error('HuaVM 虛擬機已由使用者終止執行');
      }

      const inst = instructions[this.ip];
      const op = inst.opcode;
      const operand = inst.operand;

      if (this.onVMStep) {
        await this.onVMStep({
          ip: this.ip,
          opcodeName: OPCODE_NAME_MAP[op] || '未知指令',
          stack: [...this.stack],
          locals: Object.fromEntries(this.locals.entries()),
          globals: Object.fromEntries(this.globals.entries())
        });
      }

      if (this.stepDelay > 0) {
        await new Promise(r => setTimeout(r, this.stepDelay));
      }

      switch (op) {
        case Opcode.NOP:
          this.ip++;
          break;

        case Opcode.LOAD_CONST: {
          const val = constantPool[operand];
          this.stack.push(val);
          this.ip++;
          break;
        }

        case Opcode.LOAD_VAR: {
          const varName = constantPool[operand];
          if (this.locals.has(varName)) {
            this.stack.push(this.locals.get(varName));
          } else if (this.globals.has(varName)) {
            this.stack.push(this.globals.get(varName));
          } else {
            throw new Error(`HuaVM 執行期錯誤：未定義的變數「${varName}」於 IP:${this.ip}`);
          }
          this.ip++;
          break;
        }

        case Opcode.STORE_VAR: {
          const varName = constantPool[operand];
          const val = this.stack.pop();
          this.locals.set(varName, val);
          this.ip++;
          break;
        }

        case Opcode.LOAD_GLOBAL: {
          const symName = constantPool[operand];
          if (this.globals.has(symName)) {
            this.stack.push(this.globals.get(symName));
          } else if (executable.symbolTable && executable.symbolTable[symName]) {
            this.stack.push(executable.symbolTable[symName].offset);
          } else {
            this.stack.push(symName);
          }
          this.ip++;
          break;
        }

        case Opcode.ADD: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a + b);
          this.ip++;
          break;
        }

        case Opcode.SUB: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(Number(a) - Number(b));
          this.ip++;
          break;
        }

        case Opcode.MUL: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(Number(a) * Number(b));
          this.ip++;
          break;
        }

        case Opcode.DIV: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          if (Number(b) === 0) throw new Error(`除以零錯誤於 IP:${this.ip}`);
          this.stack.push(Number(a) / Number(b));
          this.ip++;
          break;
        }

        case Opcode.MOD: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(Number(a) % Number(b));
          this.ip++;
          break;
        }

        case Opcode.POW: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(Math.pow(Number(a), Number(b)));
          this.ip++;
          break;
        }

        case Opcode.EQ: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a === b);
          this.ip++;
          break;
        }

        case Opcode.NEQ: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a !== b);
          this.ip++;
          break;
        }

        case Opcode.LT: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a < b);
          this.ip++;
          break;
        }

        case Opcode.GT: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a > b);
          this.ip++;
          break;
        }

        case Opcode.LTE: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a <= b);
          this.ip++;
          break;
        }

        case Opcode.GTE: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a >= b);
          this.ip++;
          break;
        }

        case Opcode.NOT: {
          const a = this.stack.pop();
          this.stack.push(!a);
          this.ip++;
          break;
        }

        case Opcode.AND: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a && b);
          this.ip++;
          break;
        }

        case Opcode.OR: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a || b);
          this.ip++;
          break;
        }

        case Opcode.JUMP: {
          this.ip = operand;
          break;
        }

        case Opcode.JUMP_IF_FALSE: {
          const cond = this.stack.pop();
          if (!cond) {
            this.ip = operand;
          } else {
            this.ip++;
          }
          break;
        }

        case Opcode.JUMP_IF_TRUE: {
          const cond = this.stack.pop();
          if (cond) {
            this.ip = operand;
          } else {
            this.ip++;
          }
          break;
        }

        case Opcode.BUILD_ARRAY: {
          const count = operand;
          const items = [];
          for (let i = 0; i < count; i++) {
            items.unshift(this.stack.pop());
          }
          this.stack.push(items);
          this.ip++;
          break;
        }

        case Opcode.BUILD_OBJECT: {
          const pairCount = operand;
          const obj = {};
          for (let i = 0; i < pairCount; i++) {
            const val = this.stack.pop();
            const key = this.stack.pop();
            obj[key] = val;
          }
          this.stack.push(obj);
          this.ip++;
          break;
        }

        case Opcode.GET_PROP: {
          const prop = this.stack.pop();
          const target = this.stack.pop();
          if (target === null || target === undefined) {
            throw new Error(`無法在空值上讀取屬性「${prop}」於 IP:${this.ip}`);
          }
          if (prop === '長度' && (Array.isArray(target) || typeof target === 'string')) {
            this.stack.push(target.length);
          } else {
            const val = target[prop];
            if (typeof val === 'function') {
              this.stack.push(val.bind(target));
            } else {
              this.stack.push(val);
            }
          }
          this.ip++;
          break;
        }

        case Opcode.SET_PROP: {
          const val = this.stack.pop();
          const prop = this.stack.pop();
          const target = this.stack.pop();
          target[prop] = val;
          this.stack.push(val);
          this.ip++;
          break;
        }

        case Opcode.CALL: {
          const argCount = operand;
          const callee = this.stack.pop();
          const args = [];
          for (let i = 0; i < argCount; i++) {
            args.unshift(this.stack.pop());
          }

          // 若 callee 是 JavaScript 函式 (內建模組)
          if (typeof callee === 'function') {
            const ret = await callee(...args);
            this.stack.push(ret !== undefined ? ret : null);
            this.ip++;
          }
          // 若 callee 是字節碼函式位址 (IP 數字)
          else if (typeof callee === 'number') {
            this.callStack.push({
              returnIP: this.ip + 1,
              savedLocals: new Map(this.locals)
            });
            // 參數推回棧上供函式內 STORE_VAR 讀取
            for (const arg of args) {
              this.stack.push(arg);
            }
            this.ip = callee;
          } else {
            throw new Error(`嘗試呼叫非函式物件於 IP:${this.ip}`);
          }
          break;
        }

        case Opcode.RETURN: {
          const retVal = this.stack.pop();
          if (this.callStack.length > 0) {
            const frame = this.callStack.pop();
            this.locals = frame.savedLocals;
            this.stack.push(retVal);
            this.ip = frame.returnIP;
          } else {
            this.isHalted = true;
          }
          break;
        }

        case Opcode.PRINT: {
          const argCount = operand;
          const args = [];
          for (let i = 0; i < argCount; i++) {
            args.unshift(this.stack.pop());
          }
          const outputStr = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
          this.onPrint(outputStr);
          this.ip++;
          break;
        }

        case Opcode.HALT:
          this.isHalted = true;
          break;

        default:
          throw new Error(`HuaVM 未知指令操作碼 0x${op.toString(16)} 於 IP:${this.ip}`);
      }
    }

    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }
}
