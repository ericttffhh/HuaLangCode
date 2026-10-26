/**
 * 華語 (HuaLang) - 抽象語法樹 (AST) 節點定義
 */

export class ASTNode {
  constructor(type, line = 0, column = 0) {
    this.type = type;
    this.line = line;
    this.column = column;
  }
}

export class ProgramNode extends ASTNode {
  constructor(body = [], line = 1, column = 1) {
    super('Program', line, column);
    this.body = body;
  }
}

export class VariableDeclarationNode extends ASTNode {
  constructor(kind, identifier, init, line, column) {
    super('VariableDeclaration', line, column);
    this.kind = kind; // '變數' 或 '常數'
    this.identifier = identifier; // IdentifierNode
    this.init = init; // ExpressionNode
  }
}

export class AssignmentNode extends ASTNode {
  constructor(left, operator, right, line, column) {
    super('Assignment', line, column);
    this.left = left;
    this.operator = operator;
    this.right = right;
  }
}

export class IfStatementNode extends ASTNode {
  constructor(test, consequent, alternate = null, line, column) {
    super('IfStatement', line, column);
    this.test = test;
    this.consequent = consequent; // BlockStatementNode
    this.alternate = alternate; // BlockStatementNode or IfStatementNode
  }
}

export class WhileStatementNode extends ASTNode {
  constructor(test, body, line, column) {
    super('WhileStatement', line, column);
    this.test = test;
    this.body = body; // BlockStatementNode
  }
}

export class RangeForStatementNode extends ASTNode {
  constructor(iterator, from, to, step, body, line, column) {
    super('RangeForStatement', line, column);
    this.iterator = iterator; // IdentifierNode
    this.from = from; // ExpressionNode
    this.to = to; // ExpressionNode
    this.step = step; // ExpressionNode or null (default 1)
    this.body = body; // BlockStatementNode
  }
}

export class ForEachStatementNode extends ASTNode {
  constructor(item, collection, body, line, column) {
    super('ForEachStatement', line, column);
    this.item = item; // IdentifierNode
    this.collection = collection; // ExpressionNode
    this.body = body; // BlockStatementNode
  }
}

export class FunctionDeclarationNode extends ASTNode {
  constructor(name, params, body, line, column) {
    super('FunctionDeclaration', line, column);
    this.name = name; // IdentifierNode
    this.params = params; // array of IdentifierNode
    this.body = body; // BlockStatementNode
  }
}

export class ReturnStatementNode extends ASTNode {
  constructor(argument, line, column) {
    super('ReturnStatement', line, column);
    this.argument = argument;
  }
}

export class BreakStatementNode extends ASTNode {
  constructor(line, column) {
    super('BreakStatement', line, column);
  }
}

export class ContinueStatementNode extends ASTNode {
  constructor(line, column) {
    super('ContinueStatement', line, column);
  }
}

export class BlockStatementNode extends ASTNode {
  constructor(body = [], line, column) {
    super('BlockStatement', line, column);
    this.body = body;
  }
}

export class ExpressionStatementNode extends ASTNode {
  constructor(expression, line, column) {
    super('ExpressionStatement', line, column);
    this.expression = expression;
  }
}

export class BinaryExpressionNode extends ASTNode {
  constructor(operator, left, right, line, column) {
    super('BinaryExpression', line, column);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

export class LogicalExpressionNode extends ASTNode {
  constructor(operator, left, right, line, column) {
    super('LogicalExpression', line, column);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

export class UnaryExpressionNode extends ASTNode {
  constructor(operator, argument, line, column) {
    super('UnaryExpression', line, column);
    this.operator = operator;
    this.argument = argument;
  }
}

export class CallExpressionNode extends ASTNode {
  constructor(callee, args = [], line, column) {
    super('CallExpression', line, column);
    this.callee = callee;
    this.args = args;
  }
}

export class MemberExpressionNode extends ASTNode {
  constructor(object, property, computed = false, line, column) {
    super('MemberExpression', line, column);
    this.object = object;
    this.property = property;
    this.computed = computed; // true: a[i], false: a.b
  }
}

export class LiteralNode extends ASTNode {
  constructor(value, raw, line, column) {
    super('Literal', line, column);
    this.value = value;
    this.raw = raw;
  }
}

export class IdentifierNode extends ASTNode {
  constructor(name, line, column) {
    super('Identifier', line, column);
    this.name = name;
  }
}

export class ArrayLiteralNode extends ASTNode {
  constructor(elements = [], line, column) {
    super('ArrayLiteral', line, column);
    this.elements = elements;
  }
}

export class ObjectPropertyNode extends ASTNode {
  constructor(key, value, line, column) {
    super('ObjectProperty', line, column);
    this.key = key;
    this.value = value;
  }
}

export class ObjectLiteralNode extends ASTNode {
  constructor(properties = [], line, column) {
    super('ObjectLiteral', line, column);
    this.properties = properties;
  }
}
