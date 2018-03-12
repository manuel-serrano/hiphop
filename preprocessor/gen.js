"use strict"

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

exports.Literal = (value, string=false, template=false) => {
   if (string) {
      return template ? "`" + value + "`" : `"${value}"`;
   }
   return value;
}

exports.XML = (openOrLeaf, xmlBody=undefined, close=undefined) => {
   if (xmlBody) {
      return `${openOrLeaf}${xmlBody}${close}`;
   }
   return openOrLeaf;
}

exports.XMLBody = els => {
   let buf = "";

   for (let i in els) {
      let el = els[i];
      if (el.stringDelim) {
	 buf += `${el.stringDelim}${el.value}${el.stringDelim}`;
      } else if (el.value) {
	 buf += el.value;
      } else {
	 buf += el;
      }

      if (el.blankNext) {
	 buf += " ";
      }
   }
   return buf;
}

exports.Tilde = stmt => `~{${stmt}}`;

exports.This = () => "this";

exports.Unresolved = value => value;

exports.Identifier = value => value;

exports.EmptySlot = () => "";

exports.ArrayLiteral = slots => {
   let buf = "[";
   let len = slots.length;

   for (let i = 0; i < len; i++) {
      buf += slots[i];
      if (i + 1 < len) {
	 buf += ",";
      }
   }
   buf += "]";
   return buf;
};

exports.ObjectLiteral = props => {
   let buf = "{";
   let len = props.length;

   for (let i = 0; i < len; i++) {
      buf += props[i];
      if (i + 1 < len) {
	 buf += ",";
      }
   }
   buf += "}";
   return buf;
};

exports.PropertyAssignmentGet = (name, funcBody) => (
   `get ${name}() {${funcBody}}`
);

exports.PropertyAssignmentSet = (name, arg, funcBody) => (
   `set ${name}(${arg}) {${funcBody}}`
);

exports.PropertyAssignment = (name, expr) => `${name}: ${expr}`;

exports.AccessBracket = (expr, field) => `${expr}[${field}]`;

exports.AccessDot = (expr, field) => `${expr}.${field}`;

function list(els, sep=",") {
   let buf = "";
   let len = els.length;

   for (let i = 0; i < len; i++) {
      buf += els[i];
      if (i + 1 < len) {
	 buf += sep;
      }
   }
   return buf;
}

exports.New = (clsOrExpr, args) => `new ${clsOrExpr}(${list(args)})`;

exports.Call = (expr, args) => `${expr}(${list(args)})`;

exports.Binary = (lhs, op, rhs) => `(${lhs} ${op} ${rhs})`;

exports.Prefix = (op, rhs) => `(${op}(${rhs}))`;

exports.Postfix = (lhs, op) => `((${lhs})${op})`;

exports.Unary = (op, expr) => `(${op} ${expr})`;

exports.Conditional = (test, t, e) => `(${test} ? ${t} : ${e})`;

exports.Assign = (lhs, op, rhs) => `(${lhs} ${op} ${rhs})`;

exports.Sequence = exprs => list(exprs);

exports.Block = stmts => `{ ${list(stmts, ";")} }`;

exports.VariableStmt = (vtype, varDecls) => `${vtype} ${list(varDecls)};`;

exports.VariableDeclaration = (nameId, init) => (
   `${nameId}${init ? ` = ${init}` : ''}`
);

exports.EmptyStatement = () => ";";

exports.ExpressionStatement = expr => `${expr};`;

exports.If = (test, _then, _else) => {
   let buf = `if (${test}) ${_then}`;

   if (_else) {
      buf += `else ${_else}`;
   }
   return buf;
}

exports.Do = (test, stmt) => `do ${stmt} while (${test})`;

exports.While = (test, stmt) => `while (${test}) ${stmt}`;

exports.For = (vtype, initVarDecl, init, test, after, stmt) => {
   let buf = `for (`;

   if (vtype) {
      buf += `${vtype} `;
   }

   if (initVarDecl) {
      buf += list(initVarDecl);
   } else if (init) {
      buf += init;
   }
   buf += "; ";

   if (test) {
      buf += test;
   }
   buf += "; ";

   if (after) {
      buf += after;
   }
   buf += `) ${stmt}`;
   return buf;
};

exports.ForIn = (vtype, varDecl, expr, stmt) => {
   let buf = `for (`;

   if (vtype) {
      buf += `${vtype} `;
   }

   buf += `${list(varDecl)} in ${expr}) ${stmt}`;
   return buf;
};

exports.Continue = id => `continue ${id};`;

exports.Break = id => `break ${id};`;

exports.Return = expr => `return ${expr};`;

exports.With = (expr, stmt) => `with (${expr}) ${stmt}`;

exports.Switch = (expr, caseBlk) => `switch (${expr}) ${caseBlk}`;

exports.CaseBlock = caseClauses => `{ ${list(caseClauses, " ")} }`;

exports.CaseClause = (expr, stmts) => `case ${expr}: ${list(stmts, ";")}`;

exports.DefaultClause = stmts => `default: ${list(stmts, ";")}`;

exports.LabelledStmt = (label, stmt) => `${label}: ${stmt}`;

exports.Throw = expr => `throw ${expr};`;

exports.Try = (block, catch_, finally_) => {
   let buf = `try ${block}`;

   if (catch_) {
      buf += ` ${catch_}`;
   }

   if (finally_) {
      buf += ` ${finally_}`;
   }
   return buf;
}

exports.Catch = (id, block) => `catch (${id}) ${block}`;

exports.Finally = block => `finally ${block}`;

exports.Debugger = () => `debugger;`;

exports.ServiceDeclaration = (id, params, body) => {
   var b = body ? `{ ${body} }` : ";";
   return `service ${id}(${list(params)}) ${b}`;
}

exports.ServiceExpression = (id, params, body) => {
   var b = body ? `{ ${body} }` : "";
   return `(service ${id}(${list(params)}) ${b})`;
}

exports.FunctionDeclaration = (id, params, body) => {
   return `function ${id}(${list(params)}) { ${body} }`;
}

exports.FunctionExpression = (id, params, body) => {
   return `(function ${id}(${list(params)}) { ${body} })`;
}

exports.Parameter = (id, initExpr) => {
   let buf = id;

   if (initExpr) {
      buf += `=${initExpr}`;
   }
   return buf;
}

exports.Program = sourceEls => list(sourceEls, " ");

//
// Hiphop.js nodes
//

exports.HHModule = (id, sigDeclList, stmts) => {
   let decls = list(sigDeclList, " ");
   let name = id ? `__hh_reserved_debug_name__="${id}"` : "";
   return `<hh.module ${name} ${decls}>${stmts}</hh.module>`;
}

exports.HHLocal = (sigDeclList, block) => {
   let decls = list(sigDeclList, " ");
   return `<hh.local ${decls}>${block}</hh.local>`;
}

const accmap = {
   'IN': 1,
   'OUT': 2,
   'INOUT': 3
}

exports.Signal = (id, accessibility, initExpr, combineExpr) => {
   let accessibilityBuf = `accessibility: ${accmap[accessibility]}`;
   let initExprBuf = initExpr ? `, initApply: function(){return ${initExpr}}` : "";
   let combineExprBuf = "";

   if (combineExpr) {
      if (combineExpr.func) {
	 combineExprBuf = `, combine: function(){return ${combineExpr.func}}`;
      }

      if (combineExpr.identifier) {
	 combineExprBuf = `, combine: ${combineExpr.identifier}`
      }
   }
   return `${id}=${"${"}{${accessibilityBuf} ${initExprBuf} ${combineExprBuf}}}`;
}

exports.HHSequence = stmts => `<hh.sequence >${list(stmts, "")}</hh.sequence>`;

exports.HHHalt = () => `<hh.halt/>`;

exports.HHPause = () => `<hh.pause/>`;

exports.HHNothing = () => `<hh.nothing/>`;

exports.HHIf = (test, t, e) => (
   `<hh.if ${hhExpr("apply", test)}>${t}${e}</hh.if>`
);

exports.HHFork = (branches, forkId) => {
   let id = forkId ? `id=${forkId}` : "";
   return `<hh.parallel ${id}>${list(branches, "")}</hh.parallel>`;
}

exports.HHAbort = (texpr, body) => `<hh.abort ${texpr}>${body}</hh.abort>`;

exports.HHWeakAbort = (texpr, body) => (
   `<hh.weakAbort ${texpr}>${body}</hh.weakAbort>`
);

exports.HHLoop = body => `<hh.loop>${body}</hh.loop>`;

exports.HHEvery = (texpr, body) => `<hh.every ${texpr}>${body}</hh.every>`;

exports.HHLoopeach = (texpr, body) => (
   `<hh.loopeach ${texpr}>${body}</hh.loopeach>`
);

exports.HHAwait = texpr => `<hh.await ${texpr}/>`;

exports.HHEmitExpr = (id, expr) => id + (expr ? hhExpr(" apply", expr) : "");

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

exports.HHEmit = args => emit(args, expr => `<hh.emit ${expr}/>`);

exports.HHSustain = args => emit(args, expr =>`<hh.sustain ${expr}/>`);

exports.HHTrap = (id, body) => `<hh.trap ${id}>${body}</hh.trap>`;

exports.HHExit = id => `<hh.exit ${id}/>`;

exports.HHRun = (expr, assocs) => {
   let moduleBuf = `module=${"$"}{${expr}}`;
   let assocBuf = "";

   for (let i in assocs) {
      let assoc = assocs[i];

      assocBuf += ` ${assoc.calleeSignalId}=${assoc.callerSignalId}`;
   }

   return `<hh.run ${moduleBuf} ${assocBuf}/>`;
}

exports.HHSuspend = (texpr, body, emitWhenSuspended) => {
   let ews = emitWhenSuspended ? `emitWhenSuspended=${emitWhenSuspended}` : "";
   return `<hh.suspend ${texpr} ${ews}>${body}</hh.suspend>`;
}

exports.HHSuspendToggle = (expr, body, emitWhenSuspended) => {
   let ews = emitWhenSuspended ? `emitWhenSuspended=${emitWhenSuspended}` : "";
   return `<hh.suspend ${hhExpr("toggleApply", expr)} ${ews}>${body}</hh.suspend>`;
}

exports.HHSuspendFromTo = (from, to, immediate, body, emitWhenSuspended) => {
   let immBuf = immediate ? "immediate" : "";
   let fromBuf = hhExpr("fromApply", from);
   let toBuf = hhExpr("toApply", to);
   let ews = emitWhenSuspended ? `emitWhenSuspended=${emitWhenSuspended}` : "";

   return `<hh.suspend ${immBuf} ${fromBuf} ${toBuf} ${ews}>${body}</hh.suspend>`;
}

exports.HHExecParams = params => {
   let paramsBuf = "";

   Object.keys(params).forEach(key => {
      let param = params[key];

      if (param) {
	 paramsBuf += `${hhJSStmt(key.toLowerCase().substr(2), param)} `;
      }
   });
   return paramsBuf;
};

exports.HHExec = (startExpr, params) => {
   return `<hh.exec ${hhJSStmt("apply", startExpr)} ${params}/>`;
}

exports.HHExecEmit = (id, startExpr, params) => {
   return `<hh.exec ${id} ${hhJSStmt("apply", startExpr)} ${params}/>`;
}

exports.HHPromise = (thenId, catchId, expr, params) => {
   return '<hh.local promiseReturn>'
      + `<hh.exec promiseReturn apply=${"$"}{function() {`
      + `let self = this;`
      + `${expr}.then(function(v) {`
      + `self.terminateExecAndReact({resolve: true, value: v});`
      + `}).catch(function(v) {self.terminateExecAndReact(`
      + `{resolve: false, value: v}); }); }} ${params}/>`
      + `<hh.if apply=${"$"}{`
      + `function() {return this.value.promiseReturn.resolve}}>`
      + `<hh.emit ${thenId} apply=${"$"}{`
      + `function() { return this.value.promiseReturn.value;}}/>`
      + `<hh.emit ${catchId} apply=${"$"}{function() {`
      + `return this.value.promiseReturn.value; }}/> </hh.if></hh.local>`;
}

exports.Dollar = expr => `${"$"}{${expr}}`;

exports.HHBlock = (varDecls, seq) => {
   if (varDecls.length == 0) {
      return seq;
   }
   return `${"$"}{(function() {${list(varDecls, "")} return ${seq}})()}`;
}

exports.HHAtom = jsStmts => `<hh.atom ${hhJSStmt("apply", jsStmts)}/>`;

exports.HHWhile = (expr, body) => {
   return `<hh.trap While>`
      + `<hh.loop>`
      + `<hh.if ${expr}>`
      + `<hh.nothing/>`
      + `<hh.exit While/>`
      + `</hh.if>`
      + `${body}`
      + `</hh.loop>`
      + `</hh.trap>`;
}

exports.HHFor = (declList, whileExpr, eachStmt, body) => {
   return `<hh.trap For>`
      + `<hh.local ${list(declList, " ")}>`
      + `<hh.loop>`
      + `<hh.if ${whileExpr}>`
      + `<hh.nothing/>`
      + `<hh.exit For/>`
      + `</hh.if>`
      + `${body}`
      + `${eachStmt}`
      + `</hh.loop>`
      + `</hh.local>`
      + `</hh.trap>`;
}

const hhExpr = (attr, expr) => `${attr}=${"$"}{function(){return ${expr}}}`;

const hhJSStmt = (attr, stmts) => `${attr}=${"$"}{function(){${stmts}}}`;

exports.HHTemporalExpression = (immediate, expr) => (
   `${immediate ? "immediate" : ""} ${hhExpr("apply", expr)}`
);

exports.HHAccessor = (symb, id) => `${symb}${id ? `.${id}` : ''}`;
