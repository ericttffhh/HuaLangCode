/**
 * 華語 (HuaLang) - 語法分析器 (Parser)
 * 採用遞迴下降解析 (Recursive Descent Parser)
 */

import { TokenType } from './lexer.js';
import * as AST from './ast.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
  }

  parse() {
    this.cursor = 0;
    const body = [];

    while (!this.isAtEnd()) {
      // 忽略多餘的分號
      if (this.matchPunctuation(';')) {
        this.advance();
        continue;
      }
      body.push(this.parseStatement());
    }

    const firstToken = this.tokens[0] || { line: 1, column: 1 };
    return new AST.ProgramNode(body, firstToken.line, firstToken.column);
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  peek() {
    return this.tokens[this.cursor] || { type: TokenType.EOF, value: null, line: 0, column: 0 };
  }

  peekNext() {
    return this.tokens[this.cursor + 1] || { type: TokenType.EOF, value: null, line: 0, column: 0 };
  }

  advance() {
    if (!this.isAtEnd()) this.cursor++;
    return this.previous();
  }

  previous() {
    return this.tokens[this.cursor - 1];
  }

  check(type, value = null) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== null && token.value !== value) return false;
    return true;
  }

  matchKeyword(value) {
    return this.check(TokenType.KEYWORD, value);
  }

  matchPunctuation(value) {
    return this.check(TokenType.PUNCTUATION, value);
  }

  matchOperator(value) {
    return this.check(TokenType.OPERATOR, value);
  }

  consume(type, expectedValue, errorMsg) {
    if (this.check(type, expectedValue)) {
      return this.advance();
    }
    const token = this.peek();
    throw new Error(
      `第 ${token.line} 行第 ${token.column} 列：${errorMsg || `語法錯誤，預期為「${expectedValue || type}」，但遇到「${token.raw || token.value || '檔案結尾'}」`}`
    );
  }

  parseStatement() {
    // 變數或常數宣告
    if (this.matchKeyword('變數') || this.matchKeyword('設') || this.matchKeyword('令')) {
      return this.parseVariableDeclaration('變數');
    }
    if (this.matchKeyword('常數')) {
      return this.parseVariableDeclaration('常數');
    }

    // 條件陳述
    if (this.matchKeyword('若') || this.matchKeyword('如果')) {
      return this.parseIfStatement();
    }

    // 當型循環
    if (this.matchKeyword('當')) {
      return this.parseWhileStatement();
    }

    // 計數循環 (從 ... 到 ...)
    if (this.matchKeyword('從')) {
      return this.parseRangeForStatement();
    }

    // 遍歷 (遍歷 陣列 於 項目 { ... })
    if (this.matchKeyword('遍歷')) {
      return this.parseForEachStatement();
    }

    // 通用循環 (循環 (設 i=0; i<10; i+=1) { ... })
    if (this.matchKeyword('循環')) {
      return this.parseClassicForStatement();
    }

    // 函式定義
    if (this.matchKeyword('函式') || this.matchKeyword('定義') || this.matchKeyword('函數')) {
      return this.parseFunctionDeclaration();
    }

    // 回傳
    if (this.matchKeyword('回傳') || this.matchKeyword('返回')) {
      return this.parseReturnStatement();
    }

    // 跳出與繼續
    if (this.matchKeyword('跳出') || this.matchKeyword('中斷')) {
      const tok = this.advance();
      this.matchPunctuation(';');
      return new AST.BreakStatementNode(tok.line, tok.column);
    }
    if (this.matchKeyword('繼續')) {
      const tok = this.advance();
      this.matchPunctuation(';');
      return new AST.ContinueStatementNode(tok.line, tok.column);
    }

    // 區塊陳述
    if (this.matchPunctuation('{')) {
      return this.parseBlockStatement();
    }

    // 表達式陳述 (例如賦值或函式調用)
    return this.parseExpressionStatement();
  }

  parseVariableDeclaration(kind) {
    const startToken = this.advance(); // '變數' 或 '常數'
    const idToken = this.consume(TokenType.IDENTIFIER, null, `變數宣告缺少名稱`);
    const identifier = new AST.IdentifierNode(idToken.value, idToken.line, idToken.column);

    let init = null;
    // 支援「=」或「為」或直接賦值
    if (this.matchOperator('=')) {
      this.advance();
      init = this.parseExpression();
    } else if (this.matchKeyword('為') || (this.check(TokenType.IDENTIFIER, '為'))) {
      this.advance();
      init = this.parseExpression();
    }

    if (this.matchPunctuation(';')) {
      this.advance();
    }

    return new AST.VariableDeclarationNode(kind, identifier, init, startToken.line, startToken.column);
  }

  parseIfStatement() {
    const startToken = this.advance(); // 若
    let test;
    if (this.matchPunctuation('(')) {
      this.advance();
      test = this.parseExpression();
      this.consume(TokenType.PUNCTUATION, ')', `若 條件後缺少「)」`);
    } else {
      test = this.parseExpression();
    }

    const consequent = this.parseBlockStatement();
    let alternate = null;

    if (this.matchKeyword('否則若') || this.matchKeyword('又若')) {
      alternate = this.parseIfStatement();
    } else if (this.matchKeyword('否則')) {
      this.advance();
      if (this.matchKeyword('若') || this.matchKeyword('如果')) {
        alternate = this.parseIfStatement();
      } else {
        alternate = this.parseBlockStatement();
      }
    }

    return new AST.IfStatementNode(test, consequent, alternate, startToken.line, startToken.column);
  }

  parseWhileStatement() {
    const startToken = this.advance(); // 當
    let test;
    if (this.matchPunctuation('(')) {
      this.advance();
      test = this.parseExpression();
      this.consume(TokenType.PUNCTUATION, ')', `當 條件後缺少「)」`);
    } else {
      test = this.parseExpression();
    }

    const body = this.parseBlockStatement();
    return new AST.WhileStatementNode(test, body, startToken.line, startToken.column);
  }

  // 從 1 到 10 循環 (計數) [步長 2] { ... }
  parseRangeForStatement() {
    const startToken = this.advance(); // 從
    const from = this.parseExpression();
    this.consume(TokenType.KEYWORD, '到', `範圍循環語法：從 <起點> 到 <終點> 循環 (<變數名>)`);
    const to = this.parseExpression();

    this.consume(TokenType.KEYWORD, '循環', `範圍循環缺少關鍵字「循環」`);

    this.consume(TokenType.PUNCTUATION, '(', `循環變數需用括號包裹，例如：(計數)`);
    const idToken = this.consume(TokenType.IDENTIFIER, null, `循環變數缺少名稱`);
    const iterator = new AST.IdentifierNode(idToken.value, idToken.line, idToken.column);
    this.consume(TokenType.PUNCTUATION, ')', `循環變數缺少「)」`);

    let step = null;
    if (this.check(TokenType.IDENTIFIER, '步長') || this.matchKeyword('步長')) {
      this.advance();
      step = this.parseExpression();
    }

    const body = this.parseBlockStatement();
    return new AST.RangeForStatementNode(iterator, from, to, step, body, startToken.line, startToken.column);
  }

  // 遍歷 陣列 作為 項目 { ... } 或 遍歷 陣列 於 項目 { ... }
  parseForEachStatement() {
    const startToken = this.advance(); // 遍歷
    const collection = this.parseExpression();

    if (this.matchKeyword('作為') || this.matchKeyword('於') || this.check(TokenType.IDENTIFIER, '於') || this.check(TokenType.IDENTIFIER, '作為')) {
      this.advance();
    } else {
      throw new Error(`第 ${startToken.line} 行：遍歷語法應為「遍歷 <陣列> 於 <項目變數> { ... }」`);
    }

    const idToken = this.consume(TokenType.IDENTIFIER, null, `遍歷陳述缺少項目名稱`);
    const item = new AST.IdentifierNode(idToken.value, idToken.line, idToken.column);
    const body = this.parseBlockStatement();

    return new AST.ForEachStatementNode(item, collection, body, startToken.line, startToken.column);
  }

  // 循環 (設 i = 0; i < 10; i = i + 1) { ... }
  parseClassicForStatement() {
    const startToken = this.advance(); // 循環
    this.consume(TokenType.PUNCTUATION, '(', `循環開頭缺少「(」`);

    let init = null;
    if (!this.matchPunctuation(';')) {
      if (this.matchKeyword('設') || this.matchKeyword('令') || this.matchKeyword('變數')) {
        init = this.parseVariableDeclaration('變數');
      } else {
        init = this.parseExpression();
        this.consume(TokenType.PUNCTUATION, ';', `循環初始式後缺少「;」`);
      }
    } else {
      this.advance();
    }

    let test = null;
    if (!this.matchPunctuation(';')) {
      test = this.parseExpression();
    }
    this.consume(TokenType.PUNCTUATION, ';', `循環判斷式後缺少「;」`);

    let update = null;
    if (!this.matchPunctuation(')')) {
      update = this.parseExpression();
    }
    this.consume(TokenType.PUNCTUATION, ')', `循環條件後缺少「)」`);

    const body = this.parseBlockStatement();

    // 經典 for 轉為 AST 結構 (以 WhileStatement + Block 模擬)
    const blockBody = [];
    if (init) blockBody.push(init);
    const whileBodyStatements = [...body.body];
    if (update) whileBodyStatements.push(new AST.ExpressionStatementNode(update, update.line, update.column));
    const whileNode = new AST.WhileStatementNode(
      test || new AST.LiteralNode(true, '真', startToken.line, startToken.column),
      new AST.BlockStatementNode(whileBodyStatements, body.line, body.column),
      startToken.line,
      startToken.column
    );
    blockBody.push(whileNode);

    return new AST.BlockStatementNode(blockBody, startToken.line, startToken.column);
  }

  parseFunctionDeclaration() {
    const startToken = this.advance(); // 函式
    const nameToken = this.consume(TokenType.IDENTIFIER, null, `函式缺少名稱`);
    const name = new AST.IdentifierNode(nameToken.value, nameToken.line, nameToken.column);

    this.consume(TokenType.PUNCTUATION, '(', `函式名稱後缺少「(」`);
    const params = [];
    if (!this.matchPunctuation(')')) {
      do {
        const paramToken = this.consume(TokenType.IDENTIFIER, null, `函式參數名稱不合法`);
        params.push(new AST.IdentifierNode(paramToken.value, paramToken.line, paramToken.column));
      } while (this.matchPunctuation(',') && this.advance());
    }
    this.consume(TokenType.PUNCTUATION, ')', `函式參數列後缺少「)」`);

    const body = this.parseBlockStatement();
    return new AST.FunctionDeclarationNode(name, params, body, startToken.line, startToken.column);
  }

  parseReturnStatement() {
    const startToken = this.advance(); // 回傳
    let arg = null;
    if (!this.matchPunctuation(';') && !this.matchPunctuation('}') && !this.isAtEnd()) {
      arg = this.parseExpression();
    }
    if (this.matchPunctuation(';')) this.advance();
    return new AST.ReturnStatementNode(arg, startToken.line, startToken.column);
  }

  parseBlockStatement() {
    const startToken = this.consume(TokenType.PUNCTUATION, '{', `區塊需以「{」開頭`);
    const body = [];
    while (!this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
      if (this.matchPunctuation(';')) {
        this.advance();
        continue;
      }
      body.push(this.parseStatement());
    }
    this.consume(TokenType.PUNCTUATION, '}', `區塊缺少結尾「}」`);
    return new AST.BlockStatementNode(body, startToken.line, startToken.column);
  }

  parseExpressionStatement() {
    const expr = this.parseExpression();
    if (this.matchPunctuation(';')) this.advance();
    return new AST.ExpressionStatementNode(expr, expr.line, expr.column);
  }

  parseExpression() {
    return this.parseAssignment();
  }

  parseAssignment() {
    const expr = this.parseLogicalOr();

    if (
      this.matchOperator('=') ||
      this.matchOperator('+=') ||
      this.matchOperator('-=') ||
      this.matchOperator('*=') ||
      this.matchOperator('/=')
    ) {
      const opToken = this.advance();
      const right = this.parseAssignment();

      if (expr instanceof AST.IdentifierNode || expr instanceof AST.MemberExpressionNode) {
        return new AST.AssignmentNode(expr, opToken.value, right, opToken.line, opToken.column);
      }
      throw new Error(`第 ${opToken.line} 行：賦值目標無效，只能賦值給變數或物件屬性`);
    }

    return expr;
  }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.matchOperator('||')) {
      const op = this.advance();
      const right = this.parseLogicalAnd();
      left = new AST.LogicalExpressionNode(op.value, left, right, op.line, op.column);
    }
    return left;
  }

  parseLogicalAnd() {
    let left = this.parseEquality();
    while (this.matchOperator('&&')) {
      const op = this.advance();
      const right = this.parseEquality();
      left = new AST.LogicalExpressionNode(op.value, left, right, op.line, op.column);
    }
    return left;
  }

  parseEquality() {
    let left = this.parseRelational();
    while (this.matchOperator('==') || this.matchOperator('!=')) {
      const op = this.advance();
      const right = this.parseRelational();
      left = new AST.BinaryExpressionNode(op.value, left, right, op.line, op.column);
    }
    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();
    while (
      this.matchOperator('<') ||
      this.matchOperator('>') ||
      this.matchOperator('<=') ||
      this.matchOperator('>=')
    ) {
      const op = this.advance();
      const right = this.parseAdditive();
      left = new AST.BinaryExpressionNode(op.value, left, right, op.line, op.column);
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.matchOperator('+') || this.matchOperator('-')) {
      const op = this.advance();
      const right = this.parseMultiplicative();
      left = new AST.BinaryExpressionNode(op.value, left, right, op.line, op.column);
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseExponential();
    while (this.matchOperator('*') || this.matchOperator('/') || this.matchOperator('%')) {
      const op = this.advance();
      const right = this.parseExponential();
      left = new AST.BinaryExpressionNode(op.value, left, right, op.line, op.column);
    }
    return left;
  }

  parseExponential() {
    let left = this.parseUnary();
    if (this.matchOperator('^')) {
      const op = this.advance();
      const right = this.parseExponential(); // 右結合
      return new AST.BinaryExpressionNode(op.value, left, right, op.line, op.column);
    }
    return left;
  }

  parseUnary() {
    if (this.matchOperator('!') || this.matchOperator('-') || this.matchOperator('+')) {
      const op = this.advance();
      const arg = this.parseUnary();
      return new AST.UnaryExpressionNode(op.value, arg, op.line, op.column);
    }
    return this.parseCallOrMember();
  }

  parseCallOrMember() {
    let expr = this.parsePrimary();

    while (true) {
      // 函式調用 f(...)
      if (this.matchPunctuation('(')) {
        this.advance();
        const args = [];
        if (!this.matchPunctuation(')')) {
          do {
            args.push(this.parseExpression());
          } while (this.matchPunctuation(',') && this.advance());
        }
        const closeParen = this.consume(TokenType.PUNCTUATION, ')', `函式調用缺少「)」`);
        expr = new AST.CallExpressionNode(expr, args, closeParen.line, closeParen.column);
      }
      // 屬性存取 a.b
      else if (this.matchPunctuation('.')) {
        this.advance();
        const propToken = this.consume(TokenType.IDENTIFIER, null, `「.」後面預期為屬性名稱`);
        const propNode = new AST.IdentifierNode(propToken.value, propToken.line, propToken.column);
        expr = new AST.MemberExpressionNode(expr, propNode, false, propToken.line, propToken.column);
      }
      // 索引存取 a[i]
      else if (this.matchPunctuation('[')) {
        this.advance();
        const indexExpr = this.parseExpression();
        const closeSquare = this.consume(TokenType.PUNCTUATION, ']', `索引存取缺少「]」`);
        expr = new AST.MemberExpressionNode(expr, indexExpr, true, closeSquare.line, closeSquare.column);
      } else {
        break;
      }
    }

    return expr;
  }

  parsePrimary() {
    const token = this.peek();

    if (token.type === TokenType.NUMBER) {
      this.advance();
      return new AST.LiteralNode(token.value, token.raw, token.line, token.column);
    }

    if (token.type === TokenType.STRING) {
      this.advance();
      return new AST.LiteralNode(token.value, token.raw, token.line, token.column);
    }

    if (token.type === TokenType.BOOLEAN) {
      this.advance();
      return new AST.LiteralNode(token.value, token.raw, token.line, token.column);
    }

    if (token.type === TokenType.NULL) {
      this.advance();
      return new AST.LiteralNode(null, '空', token.line, token.column);
    }

    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return new AST.IdentifierNode(token.value, token.line, token.column);
    }

    // 括號表達式 (expr)
    if (this.matchPunctuation('(')) {
      this.advance();
      const expr = this.parseExpression();
      this.consume(TokenType.PUNCTUATION, ')', `表達式缺少結尾「)」`);
      return expr;
    }

    // 陣列字面量 [1, 2, 3]
    if (this.matchPunctuation('[')) {
      this.advance();
      const elements = [];
      if (!this.matchPunctuation(']')) {
        do {
          elements.push(this.parseExpression());
        } while (this.matchPunctuation(',') && this.advance());
      }
      const closeSquare = this.consume(TokenType.PUNCTUATION, ']', `陣列缺少結尾「]」`);
      return new AST.ArrayLiteralNode(elements, token.line, token.column);
    }

    // 物件字面量 { 鍵: 值, ... }
    if (this.matchPunctuation('{')) {
      this.advance();
      const properties = [];
      if (!this.matchPunctuation('}')) {
        do {
          let key;
          if (this.peek().type === TokenType.IDENTIFIER || this.peek().type === TokenType.STRING) {
            const keyTok = this.advance();
            key = keyTok.value;
          } else {
            throw new Error(`第 ${this.peek().line} 行：物件屬性名稱必須是文字或識別碼`);
          }
          this.consume(TokenType.PUNCTUATION, ':', `物件鍵值對需使用「:」分隔`);
          const val = this.parseExpression();
          properties.push(new AST.ObjectPropertyNode(key, val, token.line, token.column));
        } while (this.matchPunctuation(',') && this.advance());
      }
      this.consume(TokenType.PUNCTUATION, '}', `物件缺少結尾「}」`);
      return new AST.ObjectLiteralNode(properties, token.line, token.column);
    }

    throw new Error(`第 ${token.line} 行第 ${token.column} 列：無效的語法或未知符號「${token.raw || token.value || '未知'}」`);
  }
}
