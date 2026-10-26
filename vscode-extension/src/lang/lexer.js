/**
 * 華語 (HuaLang) - 中文程式語言分詞器 (Lexer)
 */

export const TokenType = {
  // 關鍵字
  KEYWORD: 'KEYWORD',
  // 識別碼 (變數名、函式名)
  IDENTIFIER: 'IDENTIFIER',
  // 字面量
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',
  // 運算子
  OPERATOR: 'OPERATOR',
  // 標點符號
  PUNCTUATION: 'PUNCTUATION',
  // 換行與結尾
  EOF: 'EOF'
};

// 中文關鍵字映射表
export const KEYWORDS = new Set([
  '變數', '設', '令',
  '常數',
  '若', '如果',
  '否則若', '又若',
  '否則',
  '當',
  '循環', '從', '到',
  '遍歷', '於', '作為',
  '函式', '定義', '函數',
  '回傳', '返回',
  '跳出', '中斷',
  '繼續',
  '嘗試', '捕獲',
  '真', '假', '空'
]);

// 運算子映射
export const OPERATORS = [
  '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=',
  '+', '-', '*', '/', '%', '^', '=', '<', '>', '!',
  '等於', '不等於', '大於等於', '小於等於', '大於', '小於',
  '且', '或', '非'
];

export class Token {
  constructor(type, value, line, column, raw = value) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
    this.raw = raw;
  }
}

export class Lexer {
  constructor(source) {
    this.source = source;
    this.cursor = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  tokenize() {
    this.tokens = [];
    this.cursor = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      const char = this.peek();

      // 略過空白字元 (但保留換行資訊於行列計數)
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
        continue;
      }

      if (char === '\n') {
        this.line++;
        this.column = 1;
        this.advance();
        continue;
      }

      // 註解：支援 #, //, 註： 以及 /* ... */
      if (char === '#' || (char === '/' && this.peekNext() === '/')) {
        this.skipLineComment();
        continue;
      }
      if (this.source.slice(this.cursor, this.cursor + 2) === '註：' || this.source.slice(this.cursor, this.cursor + 2) === '註:') {
        this.skipLineComment();
        continue;
      }
      if (char === '/' && this.peekNext() === '*') {
        this.skipBlockComment();
        continue;
      }

      // 數字 (支援整數與小數)
      if (this.isDigit(char)) {
        this.readNumber();
        continue;
      }

      // 字串 (支援 "...", '...', 以及中文引號 「...」, 『...』)
      if (char === '"' || char === "'" || char === '「' || char === '『') {
        this.readString(char);
        continue;
      }

      // 多字元運算子比對
      const op = this.matchOperator();
      if (op) {
        this.tokens.push(new Token(TokenType.OPERATOR, op.normalized, this.line, this.column, op.raw));
        this.advanceMany(op.raw.length);
        continue;
      }

      // 標點符號 (全形與半形自動相容)
      const punct = this.matchPunctuation(char);
      if (punct) {
        this.tokens.push(new Token(TokenType.PUNCTUATION, punct, this.line, this.column, char));
        this.advance();
        continue;
      }

      // 識別碼或關鍵字 (中文字元、英文字元、底線等)
      if (this.isIdentStart(char)) {
        this.readIdentifier();
        continue;
      }

      // 無法辨識字元，拋出具體中文錯誤
      throw new Error(`第 ${this.line} 行第 ${this.column} 列：無法辨識的字元「${char}」`);
    }

    this.tokens.push(new Token(TokenType.EOF, null, this.line, this.column, ''));
    return this.tokens;
  }

  isAtEnd() {
    return this.cursor >= this.source.length;
  }

  peek() {
    return this.isAtEnd() ? '\0' : this.source[this.cursor];
  }

  peekNext() {
    return this.cursor + 1 >= this.source.length ? '\0' : this.source[this.cursor + 1];
  }

  advance() {
    const ch = this.source[this.cursor++];
    this.column++;
    return ch;
  }

  advanceMany(count) {
    for (let i = 0; i < count; i++) {
      this.advance();
    }
  }

  skipLineComment() {
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }
  }

  skipBlockComment() {
    this.advance(); // /
    this.advance(); // *
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance();
        this.advance();
        return;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
        this.advance();
      } else {
        this.advance();
      }
    }
    throw new Error(`第 ${this.line} 行：區塊註解未正確關閉「*/」`);
  }

  isDigit(char) {
    return char >= '0' && char <= '9';
  }

  readNumber() {
    const startCol = this.column;
    let str = '';
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      str += this.advance();
    }
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      str += this.advance(); // .
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        str += this.advance();
      }
    }
    this.tokens.push(new Token(TokenType.NUMBER, parseFloat(str), this.line, startCol, str));
  }

  readString(quoteChar) {
    const startLine = this.line;
    const startCol = this.column;
    let closing = quoteChar;
    if (quoteChar === '「') closing = '」';
    if (quoteChar === '『') closing = '』';

    this.advance(); // 跳過開頭引號
    let val = '';
    while (!this.isAtEnd() && this.peek() !== closing) {
      const ch = this.peek();
      if (ch === '\n') {
        this.line++;
        this.column = 1;
        val += this.advance();
      } else if (ch === '\\') {
        this.advance();
        const esc = this.advance();
        if (esc === 'n') val += '\n';
        else if (esc === 't') val += '\t';
        else if (esc === 'r') val += '\r';
        else if (esc === '\\') val += '\\';
        else if (esc === '"') val += '"';
        else if (esc === "'") val += "'";
        else val += esc;
      } else {
        val += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`第 ${startLine} 行第 ${startCol} 列：字串未閉合，缺少結尾引號「${closing}」`);
    }

    this.advance(); // 跳過結尾引號
    this.tokens.push(new Token(TokenType.STRING, val, startLine, startCol, `${quoteChar}${val}${closing}`));
  }

  matchOperator() {
    const remaining = this.source.slice(this.cursor);
    // 依長度由大到小比對
    const sortedOps = [
      { raw: '大於等於', norm: '>=' },
      { raw: '小於等於', norm: '<=' },
      { raw: '不等於', norm: '!=' },
      { raw: '==', norm: '==' },
      { raw: '!=', norm: '!=' },
      { raw: '<=', norm: '<=' },
      { raw: '>=', norm: '>=' },
      { raw: '&&', norm: '&&' },
      { raw: '||', norm: '||' },
      { raw: '+=', norm: '+=' },
      { raw: '-=', norm: '-=' },
      { raw: '*=', norm: '*=' },
      { raw: '/=', norm: '/=' },
      { raw: '等於', norm: '==' },
      { raw: '大於', norm: '>' },
      { raw: '小於', norm: '<' },
      { raw: '且', norm: '&&' },
      { raw: '或', norm: '||' },
      { raw: '非', norm: '!' },
      { raw: '+', norm: '+' },
      { raw: '-', norm: '-' },
      { raw: '*', norm: '*' },
      { raw: '/', norm: '/' },
      { raw: '%', norm: '%' },
      { raw: '^', norm: '^' },
      { raw: '=', norm: '=' },
      { raw: '<', norm: '<' },
      { raw: '>', norm: '>' },
      { raw: '!', norm: '!' }
    ];

    for (const op of sortedOps) {
      if (remaining.startsWith(op.raw)) {
        return { raw: op.raw, normalized: op.norm };
      }
    }
    return null;
  }

  matchPunctuation(char) {
    // 支援半形與全形對照
    const punctMap = {
      '(': '(', '（': '(',
      ')': ')', '）': ')',
      '[': '[', '【': '[',
      ']': ']', '】': ']',
      '{': '{',
      '}': '}',
      ',': ',', '，': ',',
      ';': ';', '；': ';',
      ':': ':', '：': ':',
      '.': '.', '。': '.'
    };
    return punctMap[char] || null;
  }

  isIdentStart(char) {
    // 支援漢字、中文字元 (\u4e00-\u9fa5)、英文字母、底線
    return /[a-zA-Z_\$\u4e00-\u9fa5\u3400-\u4dbf]/.test(char);
  }

  isIdentPart(char) {
    return /[a-zA-Z0-9_\$\u4e00-\u9fa5\u3400-\u4dbf]/.test(char);
  }

  readIdentifier() {
    const startCol = this.column;
    let word = '';
    while (!this.isAtEnd() && this.isIdentPart(this.peek())) {
      word += this.advance();
    }

    if (KEYWORDS.has(word)) {
      let normVal = word;
      // 歸一化同義關鍵字
      if (word === '設' || word === '令' || word === '變數') normVal = '變數';
      if (word === '如果' || word === '若') normVal = '若';
      if (word === '否則若' || word === '又若') normVal = '否則若';
      if (word === '定義' || word === '函數' || word === '函式') normVal = '函式';
      if (word === '返回' || word === '回傳') normVal = '回傳';
      if (word === '中斷' || word === '跳出') normVal = '跳出';

      if (word === '真') {
        this.tokens.push(new Token(TokenType.BOOLEAN, true, this.line, startCol, word));
      } else if (word === '假') {
        this.tokens.push(new Token(TokenType.BOOLEAN, false, this.line, startCol, word));
      } else if (word === '空') {
        this.tokens.push(new Token(TokenType.NULL, null, this.line, startCol, word));
      } else {
        this.tokens.push(new Token(TokenType.KEYWORD, normVal, this.line, startCol, word));
      }
    } else {
      this.tokens.push(new Token(TokenType.IDENTIFIER, word, this.line, startCol, word));
    }
  }
}
