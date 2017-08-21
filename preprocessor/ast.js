"use strict"

exports.Literal = (value, string=false) => () => string ? `"${value}"` : value;

exports.This = () => () => "this";

exports.Unresolved = value => () => value;

exports.Identifier = value => () => value;

exports.EmptySlot = () => () => "";

exports.ArrayLiteral = slots => () => {
   let buf = "[";
   let len = slots.length;

   for (let i = 0; i < len; i++) {
      buf += slots[i]();
      if (i + 1 < len) {
	 buf += ",";
      }
   }
   buf += "]";
   return buf;
};

exports.ObjectLiteral = props => () => {
   let buf = "{";
   let len = props.length;

   for (let i = 0; i < len; i++) {
      buf += props[i]();
      if (i + 1 < len) {
	 buf += ",";
      }
   }
   buf += "}";
   return buf;
};

exports.PropertyAssignmentGet = (name, funcBody) => () => {
   return `get ${name()}() {${funcBody()}}`;
}

exports.PropertyAssignmentSet = (name, arg, funcBody) => () => {
   return `set ${name()}(${arg()}) {${funcBody()}}`;
}

exports.PropertyAssignment = (name, expr) => () => `${name()}: ${expr()}`;

exports.AccessBracket = (expr, field) => () => `${expr()}[${field()}]`;

exports.AccessDot = (expr, field) => () => `${expr()}.${field()}`;

function list(els, sep=",") {
   let buf = "";
   let len = els.length;

   for (let i = 0; i < len; i++) {
      buf += els[i]();
      if (i + 1 < len) {
	 buf += sep;
      }
   }
   return buf;
}

exports.New = (clsOrExpr, args) => () => `new ${clsOrExpr()}(${list(args)})`;

exports.Call = (expr, args) => () => `${expr()}(${list(args)})`;

exports.Binary = (lhs, op, rhs) => () => `(${lhs()} ${op} ${rhs()})`;

exports.Prefix = (op, rhs) => () => `(${op}(${rhs()}))`;

exports.Postfix = (lhs, op) => () => `((${lhs()})${op})`;

exports.Unary = (op, expr) => () => `(${op} ${expr()})`;

exports.Conditional = (test, t, e) => () => `(${test()} ? ${t()} : ${e()})`;

exports.Assign = (lhs, op, rhs) => () => `(${lhs()} ${op} ${rhs()})`;

exports.Sequence = exprs => () => list(exprs);

exports.Block = stmts => () => `{ ${list(stmts, ";")} }`;

exports.VariableStmt = (vtype, varDecls) => () => `${vtype} ${list(varDecls)};`;

exports.VariableDeclaration = (nameId, init) => () => {
   if (init) {
      return `${nameId()} = ${init()}`;
   } else {
      return `${nameId()}`;
   }
}

exports.EmptyStatement = () => () => `;`;

exports.ExpressionStatement = expr => () => `${expr()};`;

exports.If = (test, _then, _else) => () => {
   let buf = `if (${test()}) ${_then()}`;

   if (_else) {
      buf += `else ${_else()}`;
   }
   return buf;
}

exports.Do = (test, stmt) => () => `do ${stmt()} while (${test()})`;

exports.While = (test, stmt) => () => `while (${test()}) ${stmt()}`;

exports.For = (vtype, initVarDecl, init, test, after, stmt) => () => {
   let buf = `for (`;

   if (vtype) {
      buf += `${vtype} `;
   }

   if (initVarDecl) {
      buf += list(initVarDecl);
   } else if (init) {
      buf += init();
   }
   buf += "; ";

   if (test) {
      buf += test();
   }
   buf += "; ";

   if (after) {
      buf += after();
   }
   buf += `) ${stmt()}`;
   return buf;
};

exports.ForIn = (vtype, varDecl, expr, stmt) => () => {
   let buf = `for (`;

   if (vtype) {
      buf += `${vtype} `;
   }

   buf += `${list(varDecl)} in ${expr()}) ${stmt()}`;
   return buf;
};

exports.Continue = id => () => `continue ${id ? id() : ""};`;

exports.Break = id => () => `break ${id ? id() : ""};`;

exports.Return = expr => () => `return ${expr ? expr() : ""};`;

exports.With = (expr, stmt) => () => `with (${expr()}) ${stmt()}`;

exports.Switch = (expr, caseBlk) => () => `switch (${expr()}) ${caseBlk()}`;

exports.CaseBlock = caseClauses => () => `{ ${list(caseClauses, " ")} }`;

exports.CaseClause = (expr, stmts) => () => {
   return `case ${expr()}: ${list(stmts, ";")}`;
};

exports.DefaultClause = stmts => () => `default: ${list(stmts, ";")}`;

exports.LabelledStmt = (label, stmt) => () => `${label()}: ${stmt()}`;

exports.Throw = expr => () => `throw ${expr()};`;

exports.Try = (block, catch_, finally_) => () => {
   let buf = `try ${block()}`;

   if (catch_) {
      buf += ` ${catch_()}`;
   }

   if (finally_) {
      buf += ` ${finally_()}`;
   }
   return buf;
}

exports.Catch = (id, block) => () => `catch (${id()}) ${block()}`;

exports.Finally = block => () => `finally ${block()}`;

exports.Debugger = () => () => `debugger;`;

exports.FunctionDeclaration = (id, params, body) => () => {
   return `function ${id()}(${list(params)}) { ${body()} }`;
}

exports.FunctionExpression = (id, params, body) => () => {
   return `function ${id ? id() : ""}(${list(params)}) { ${body()} }`;
}

exports.Parameter = (id, initExpr) => () => {
   let buf = id();

   if (initExpr) {
      buf += `=${initExpr()}`;
   }
   return buf;
}

exports.Program = sourceEls => () => list(sourceEls, " ");
