"use strict"

const hh = require("hiphop");

//
// TODO
//
// Analysis to check that a VAR read from several parallel branches OR
// read and write in only one parallel branche. Otherwise, trigger an
// error.
//
// Generate JS constructor of HH AST nodes. It should remove all
// dependencies to Hop.js.
//

//
// JavaScript nodes
//

exports.Literal = (value, string=false, template=false) => () => {
   if (string) {
      return template ? "`" + value + "`" : `"${value}"`;
   }
   return value;
}

exports.XML = (openOrLeaf, xmlBody=null, close=null) => () => {
   if (xmlBody) {
      return `${openOrLeaf}${xmlBody()}${close}`;
   }
   return openOrLeaf;
}

exports.XMLBody = els => () => {
   let buf = "";

   for (let i in els) {
      let el = els[i];
      if (el instanceof Function) {
	 buf += el();
      } else {
	 if (el.stringDelim) {
	    buf += `${el.stringDelim}${el.value}${el.stringDelim}`;
	 } else {
	    buf += el.value;
	 }

	 if (el.blankNext) {
	    buf += " ";
	 }
      }
   }
   return buf;
}

exports.Tilde = stmt => () => `~{${stmt()}}`;

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

exports.Service = id => () => {
   return `service ${id()}();`;
}

exports.FunctionDeclaration = (id, params, body, srv) => () => {
   return (srv ? "service" : "function")
      + ` ${id()}(${list(params)}) { ${body()} }`;
}

exports.FunctionExpression = (id, params, body, srv) => () => {
   return (srv ? "(service" : "(function")
      + ` ${id ? id() : ""}(${list(params)}) { ${body()} })`;
}

exports.Parameter = (id, initExpr) => () => {
   let buf = id();

   if (initExpr) {
      buf += `=${initExpr()}`;
   }
   return buf;
}

exports.Program = sourceEls => () => list(sourceEls, " ");

//
// Hiphop.js nodes
//

exports.HHModule = (id, sigDeclList, stmts) => () => {
   let decls = list(sigDeclList, " ");
   let name = id ? `__hh_reserved_debug_name__="${id()}"` : "";
   return `<hh.module ${name} ${decls}>${stmts()}</hh.module>`;
}

exports.HHLocal = (sigDeclList, block) => () => {
   let decls = list(sigDeclList, " ");
   return `<hh.local ${decls}>${block()}</hh.local>`;
}

exports.Signal = (id, accessibility, initExpr, combineExpr) => () => {
   let accessibilityBuf = `accessibility: ${hh[accessibility]}`;
   let initExprBuf = initExpr ? `, initApply: function(){return ${initExpr()}}` : "";
   let combineExprBuf = combineExpr ? `, combine: function(){return ${combineExpr()}}` : "";
   return `${id()}=${"${"}{${accessibilityBuf} ${initExprBuf} ${combineExprBuf}}}`;
}

exports.HHSequence = stmts => () => {
   return `<hh.sequence nodebug>${list(stmts, "")}</hh.sequence>`;
}

exports.HHHalt = () => () => `<hh.halt/>`;

exports.HHPause = () => () => `<hh.pause/>`;

exports.HHNothing = () => () => `<hh.nothing/>`;

exports.HHIf = (test, t, e) => () => {
   return `<hh.if ${hhExpr("apply", test)}>${t()}${e ? e() : ""}</hh.if>`;
}

exports.HHFork = branches => () => {
   return `<hh.parallel>${list(branches, "")}</hh.parallel>`;
}

exports.HHAbort = (texpr, body) => () => {
   return `<hh.abort ${texpr()}>${body()}</hh.abort>`;
}

exports.HHWeakAbort = (texpr, body) => () => {
   return `<hh.weakAbort ${texpr()}>${body()}</hh.weakAbort>`;
}

exports.HHLoop = body => () => `<hh.loop>${body()}</hh.loop>`;

exports.HHEvery = (texpr, body) => () => {
   return`<hh.every ${texpr()}>${body()}</hh.every>`;
}

exports.HHLoopeach = (texpr, body) => () => {
   return `<hh.loopeach ${texpr()}>${body()}</hh.loopeach>`;
}

exports.HHAwait = texpr => () => `<hh.await ${texpr()}/>`;

exports.HHEmitExpr = (id, expr) => () => id() + (expr ? hhExpr(" apply", expr) : "");

function emit(args, constr) {
   if (args.length == 1) {
      return constr(args[0]);
   } else {
      let buf = "<hh.parallel>";

      for (let i in args) {
	 buf += constr(args[i]);
      }
      return `${buf}</hh.parallel>`;
   }
}

exports.HHEmit = args => () => emit(args, expr => `<hh.emit ${expr()}/>`);

exports.HHSustain = args => () => emit(args, expr =>`<hh.sustain ${expr()}/>`);

exports.HHTrap = (id, body) => () => `<hh.trap ${id()}>${body()}</hh.trap>`;

exports.HHExit = id => () => `<hh.exit ${id()}/>`;

exports.HHRun = (expr, assocs) => () => {
   let moduleBuf = `module=${"$"}{${expr()}}`;
   let assocBuf = "";

   for (let i in assocs) {
      let assoc = assocs[i];

      assocBuf += ` ${assoc.calleeSignalId}=${assoc.callerSignalId}`;
   }

   return `<hh.run ${moduleBuf} ${assocBuf}/>`;
}

exports.HHSuspend = (texpr, body, emitWhenSuspended) => () => {
   let ews = emitWhenSuspended ? `emitWhenSuspended=${emitWhenSuspended}` : "";
   return `<hh.suspend ${texpr()} ${ews}>${body()}</hh.suspend>`;
}

exports.HHSuspendToggle = (expr, body, emitWhenSuspended) => () => {
   let ews = emitWhenSuspended ? `emitWhenSuspended=${emitWhenSuspended}` : "";
   return `<hh.suspend ${hhExpr("toggleApply", expr)} ${ews}>${body()}</hh.suspend>`;
}

exports.HHSuspendFromTo = (from, to, immediate, body, emitWhenSuspended) => () => {
   let immBuf = immediate ? "immediate" : "";
   let fromBuf = hhExpr("fromApply", from);
   let toBuf = hhExpr("toApply", to);
   let ews = emitWhenSuspended ? `emitWhenSuspended=${emitWhenSuspended}` : "";

   return `<hh.suspend ${immBuf} ${fromBuf} ${toBuf} ${ews}>${body()}</hh.suspend>`;
}

exports.HHExecParams = params => () => {
   let paramsBuf = "";

   Object.keys(params).forEach(key => {
      let param = params[key];

      if (param) {
	 paramsBuf += `${hhJSStmt(key.toLowerCase().substr(2), param)} `;
      }
   });
   return paramsBuf;
};

exports.HHExec = (startExpr, params) => () => {
   return `<hh.exec ${hhJSStmt("apply", startExpr)} ${params()}/>`;
}

exports.HHExecEmit = (id, startExpr, params) => () => {
   return `<hh.exec ${id()} ${hhJSStmt("apply", startExpr)} ${params()}/>`;
}

exports.HHDollar = expr => () => `${"$"}{${expr()}}`;

exports.HHBlock = (varDecls, seq) => () => {
   if (varDecls.length == 0) {
      return seq();
   }
   return `${"$"}{(function() {${list(varDecls, "")} return ${seq()}})()}`;
}

exports.HHAtom = jsStmts => () => `<hh.atom ${hhJSStmt("apply", jsStmts)}/>`;

function hhExpr(attr, expr) {
   return `${attr}=${"$"}{function(){return ${expr()}}}`;
}

function hhJSStmt(attr, stmts) {
   return `${attr}=${"$"}{function(){${stmts()}}}`;
}

exports.HHTemporalExpression = (immediate, expr) => () => {
   return `${immediate ? "immediate" : ""} ${hhExpr("apply", expr)}`;
}

exports.HHAccessor = (symb, id) => () => {
   let idBuf = id ? "." + id() : "";

   return symb + idBuf;
}
