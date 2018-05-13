"use strict"

//
// JavaScript nodes
//

exports.Literal = (value, string=false, template=false) => {
   if (string) {
      return template ? ["`", value, "`"] : ['"', value, '"'];
   }
   return value;
}

exports.XMLLeaf = (name, attrs) => {
   const arr = ["<", name, " "];

   attrs.forEach(attr => arr.push(attr));
   arr.push("/");
   arr.push(">");
   return arr;
}

exports.XML = (name, attrs, body) => {
   const arr = ["<", name, " "];

   attrs.forEach(attr => arr.push(attr));
   arr.push(">");
   body.forEach(el => arr.push(el));
   arr.push("</");
   arr.push(name);
   arr.push(">");
   return arr;
}

exports.Tilde = block => ["~", block];

exports.This = () => "this";

exports.Unresolved = value => value;

exports.Identifier = value => value;

exports.EmptySlot = () => "";

exports.ArrayLiteral = slots => {
   let arr = ["["];
   let len = slots.length;

   for (let i = 0; i < len; i++) {
      arr.push(slots[i]);
      if (i + 1 < len) {
	 arr.push(",");
      }
   }
   arr.push("]");
   return arr;
};

exports.ObjectLiteral = props => {
   let arr = ["{"];
   let len = props.length;

   for (let i = 0; i < len; i++) {
      arr.push(props[i]);
      if (i + 1 < len) {
	 arr.push(",");
      }
   }
   arr.push("}");
   return arr;
};

exports.PropertyAssignmentGet = (name, funcBody) => [
   "get ", name, "() {", funcBody, "}"
];

exports.PropertyAssignmentSet = (name, arg, funcBody) => [
   "set ", name, "(", arg, ") {", funcBody, "}"
];

exports.PropertyAssignment = (name, expr) => [name, ":", expr];

exports.AccessBracket = (expr, field) => [expr, "[", field, "]"];

exports.AccessDot = (expr, field) => [expr, ".", field];

function list(els, sep=",") {
   let arr = [];
   let len = els.length;

   for (let i = 0; i < len; i++) {
      arr.push(els[i]);
      if (i + 1 < len) {
	 arr.push(sep);
      }
   }
   return arr;
}

exports.New = (clsOrExpr, args) => ["new ", clsOrExpr, "(", list(args), ")"];

exports.Call = (expr, args) => [expr, "(", list(args), ")"];

exports.Binary = (lhs, op, rhs) => ["(", lhs, " ", op, " ", rhs, ")"];

exports.Prefix = (op, rhs) => ["(", op, "(", rhs, "))"];

exports.Postfix = (lhs, op) => ["(", "(", lhs, ")", op, ")"];

exports.Unary = (op, expr) => ["(", op," ", expr, ")"];

exports.Conditional = (test, t, e) => ["(", test, " ? ", t, " : ", e, ")"];

exports.Assign = (lhs, op, rhs) => ["(", lhs, " ", op, " ", rhs, ")"];

exports.Sequence = exprs => list(exprs);

exports.Block = stmts => ["{", list(stmts, ";"), "}"];

exports.VariableStmt = (vtype, varDecls) => [vtype, " ", list(varDecls), ";"];

exports.VariableDeclaration = (nameId, init) => init ? [nameId, "=", init] : nameId;

exports.EmptyStatement = () => ";";

exports.ExpressionStatement = expr => [expr, ";"];

exports.If = (test, _then, _else) => {
   let arr = ["if (", test, ")", _then];

   if (_else) {
      arr.push("else ");
      arr.push(_else);
   }
   return arr;
}

exports.Do = (test, stmt) => ["do ", stmt, " while (", test, ")"];

exports.While = (test, stmt) => ["while (", test, ") ", stmt];

exports.For = (vtype, initVarDecl, init, test, after, stmt) => {
   let arr = ["for ("];

   if (vtype) {
      arr.push(vtype);
      arr.push(" ");
   }

   if (initVarDecl) {
      arr.push(list(initVarDecl));
   } else if (init) {
      arr.push(init);
   }
   arr.push("; ");

   if (test) {
      arr.push(test);
   }
   arr.push("; ");

   if (after) {
      arr.push(after);
   }
   arr.push(") ");
   arr.push(stmt);
   return arr;
};

exports.ForIn = (vtype, varDecl, expr, stmt) => {
   let arr = ["for ("];

   if (vtype) {
      arr.push(vtype);
      arr.push(" ");
   }

   arr.push(list(varDecl));
   arr.push(" in ")
   arr.push(expr);
   arr.push(") ");
   arr.push(stmt);
   return arr;
};

exports.Continue = id => ["continue ", id, ";"];

exports.Break = id => ["break ", id, ";"];

exports.Return = expr => ["return ", expr, ";"];

exports.With = (expr, stmt) => ["with (", expr, ") ", stmt];

exports.Switch = (expr, caseBlk) => ["switch (", expr, ") ", caseBlk];

exports.CaseBlock = caseClauses => ["{ ", list(caseClauses, " "), " }"];

exports.CaseClause = (expr, stmts) => ["case ", expr, ": ", list(stmts, ";")];

exports.DefaultClause = stmts => ["default: ", list(stmts, ";")];

exports.LabelledStmt = (label, stmt) => [label, ": ", stmt];

exports.Throw = expr => ["throw ", expr, ";"];

exports.Try = (block, catch_, finally_) => {
   let arr = ["try ", block];

   if (catch_) {
      arr.push(catch_);
   }

   if (finally_) {
      arr.push(finally_);
   }
   return arr;
}

exports.Catch = (id, block) => ["catch (", id, ")",  block];

exports.Finally = block => ["finally ", block];

exports.Debugger = () => `debugger;`;

exports.ServiceDeclaration = (id, params, body) => {
   if (body) {
      return ["service ", id, "(", list(params), ")", body];
   } else {
      return ["service ", id, "(", list(params), ")"];
   }
}

exports.ServiceExpression = (id, params, body) => {
   if (body) {
      return ["(service ", id, "(", list(params), ")", body, ")"];
   } else {
      return ["(service ", id, "(", list(params), "))"];
   }
}

exports.FunctionDeclaration = (id, params, body) => [
   "function ", id, "(", list(params), ") {", body, "}"
];

exports.FunctionExpression = (id, params, body) => [
   "(function ", id, "(", list(params), ") {", body, "}", ")"
];

exports.Parameter = (id, initExpr) => {
   let arr = [id];

   if (initExpr) {
      arr.push("=");
      arr.push(initExpr);
   }
   return arr;
}

exports.Program = sourceEls => list(sourceEls, " ");

//
// Hiphop.js nodes
//

exports.HHModule = (id, sigDeclList, stmts) => {
   const decls = list(sigDeclList, " ");
   const name = id ? ['__hh_reserved_debug_name__="', id, '"'] : undefined;
   return ["<hh.module ", name, " ", decls, ">", stmts, "</hh.module>"];
}

exports.HHLocal = (sigDeclList, block) => {
   const decls = list(sigDeclList, " ");
   return ["<hh.local ", decls, ">", block, "</hh.local>"];
}

const accmap = {
   'IN': 1,
   'OUT': 2,
   'INOUT': 3
}

exports.Signal = (id, accessibility, initExpr, combineExpr) => {
   const direction = accessibility ? ["accessibility: ", accmap[accessibility], ","] : undefined;
   const iexpr = initExpr ? ["initApply: function(){return ", initExpr, "},"] : undefined;
   let combexpr = undefined;

   if (combineExpr) {
      combexpr = [];

      if (combineExpr.func) {
	 combexpr.push("combine: function(){return ", combineExpr.func, "}");
      }

      if (combineExpr.identifier) {
	 combexpr.push("combine: ", combineExpr.identifier);
      }
   }
   return [id, "=${{", direction, iexpr, combexpr, "}}"];
}

exports.HHSequence = stmts => ["<hh.sequence>", list(stmts, ""), "</hh.sequence>"];

exports.HHHalt = () => `<hh.halt/>`;

exports.HHPause = () => `<hh.pause/>`;

exports.HHNothing = () => `<hh.nothing/>`;

exports.HHIf = (test, t, e) => [
   "<hh.if ", hhExpr("apply", test), ">", t, e, "</hh.if>"
];

exports.HHFork = (branches, forkId) => {
   const id = forkId ? ["id=", forkId] : undefined;
   return ["<hh.parallel ", id, ">", list(branches, ""), "</hh.parallel>"];
}

exports.HHAbort = (texpr, body) => ["<hh.abort ", texpr, ">", body, "</hh.abort>"];

exports.HHWeakAbort = (texpr, body) => [
   "<hh.weakAbort ", texpr, ">", body, "</hh.weakAbort>"
];

exports.HHLoop = body => ["<hh.loop>", body, "</hh.loop>"];

exports.HHEvery = (texpr, body) => ["<hh.every ", texpr, ">", body, "</hh.every>"];

exports.HHLoopeach = (texpr, body) => [
   "<hh.loopeach ", texpr, ">", body, "</hh.loopeach>"
];

exports.HHAwait = texpr => ["<hh.await ", texpr, "/>"];

exports.HHEmitExpr = (id, expr) => expr ? [id, hhExpr(" apply", expr)] : id;

function emit(args, constr) {
   if (args.length == 1) {
      return constr(args[0]);
   } else {
      let arr = ["<hh.parallel>"];

      for (let i in args) {
	 arr.push(constr(args[i]));
      }
      arr.push("</hh.parallel>");
      return arr;
   }
}

exports.HHEmit = args => emit(args, expr => ["<hh.emit ", expr, "/>"]);

exports.HHSustain = args => emit(args, expr =>["<hh.sustain ", expr, "/>"]);

exports.HHTrap = (id, body) => ["<hh.trap ", id, ">", body, "</hh.trap>"];

exports.HHExit = id => ["<hh.exit ", id, "/>"];

exports.HHRun = (expr, assocs) => {
   let moduleArr = ["module=${", expr, "}"];
   let assocArr = [];

   for (let i in assocs) {
      let assoc = assocs[i];

      assocArr.push(" ");
      assocArr.push(assoc.calleeSignalId);
      assocArr.push("=");
      assocArr.push(assoc.callerSignalId);
   }

   return ["<hh.run ", moduleArr, assocArr, "/>"];
}

exports.HHSuspend = (texpr, body, emitWhenSuspended) => {
   const ews = emitWhenSuspended ? ["emitWhenSuspended=", emitWhenSuspended] : undefined;
   return ["<hh.suspend ", texpr, " ", ews, ">", body, "</hh.suspend>"];
}

exports.HHSuspendToggle = (expr, body, emitWhenSuspended) => {
   const ews = emitWhenSuspended ? ["emitWhenSuspended=", emitWhenSuspended] : undefined;
   return [
      "<hh.suspend ", hhExpr("toggleApply", expr), " ", ews, ">",
      body,
      "</hh.suspend>"
   ];
}

exports.HHSuspendFromTo = (from, to, immediate, body, emitWhenSuspended) => {
   const immBuf = immediate ? "immediate" : "";
   const fromArr = hhExpr("fromApply", from);
   const toArr = hhExpr("toApply", to);
   const ews = emitWhenSuspended ? ["emitWhenSuspended=", emitWhenSuspended] : undefined;
   return [
      "<hh.suspend ${immBuf} ", fromArr, " ", toArr, " ", ews, ">",
      body,
      "</hh.suspend>"
   ];
}

exports.HHExecParams = params => {
   let paramsArr = [];

   Object.keys(params).forEach(key => {
      let param = params[key];

      if (param) {
	 paramsArr.push(hhJSStmt(key.toLowerCase().substr(2), param));
	 paramsArr.push(" ");
      }
   });
   return paramsArr;
};

exports.HHExec = (startExpr, params) => HHExecEmit(undefined, startExpr, params);

const HHExecEmit = (id, startExpr, params) => [
   "<hh.exec ",
   id,
   " ",
   hhJSStmt("apply", startExpr),
   " ",
   params,
   "/>"
];
exports.HHExecEmit = HHExecEmit;

exports.HHPromise = (thenId, catchId, expr, params) => [
   "<hh.local promiseReturn>",
   "<hh.exec promiseReturn apply=${function(){",
   "let self = this;",
   expr, ".then(function(v) {",
   "self.terminateExecAndReact({resolve: true, value: v});",
   "}).catch(function(v) {self.terminateExecAndReact(",
   "{resolve: false, value: v}); }); }} ",
   params, "/>",
   "<hh.if apply=${function() {return this.value.promiseReturn.resolve}}>",
   "<hh.emit ",
   thenId,
   " apply=${function() { return this.value.promiseReturn.value;}}/>",
   "<hh.emit ",
   catchId,
   " apply=${function() { return this.value.promiseReturn.value; }}/>",
   "</hh.if></hh.local>"
];

exports.Dollar = expr => ["${", expr, "}"];

exports.HHBlock = (varDecls, seq) => {
   if (varDecls.length == 0) {
      return seq;
   }
   return ["${(function(){", list(varDecls, ""), " return ", seq, "})()}"];
}

exports.HHAtom = jsStmts => ["<hh.atom ", hhJSStmt("apply", jsStmts), "/>"];

exports.HHWhile = (expr, body) => [
   "<hh.trap While>",
   "<hh.loop>",
   "<hh.if ", expr, ">",
   "<hh.nothing/>",
   "<hh.exit While/>",
   "</hh.if>",
   body,
   "</hh.loop>",
   "</hh.trap>",
];

exports.HHFor = (declList, whileExpr, eachStmt, body) => [
   "<hh.trap For>",
   "<hh.local ", list(declList, " "), ">",
   "<hh.loop>",
   "<hh.if ", whileExpr, ">",
   "<hh.nothing/>", "<hh.exit For/>",
   "</hh.if>",
   body,
   eachStmt,
   "</hh.loop>",
   "</hh.local>",
   "</hh.trap>"
];

const hhExpr = (attr, expr) => [attr, "=", "${function(){return ", expr, "}}"];

const hhJSStmt = (attr, stmts) => [attr, "=", "${function(){", stmts, "}}"];

exports.HHTemporalExpression = (immediate, expr) => [
   immediate ? "immediate " : undefined,
   hhExpr("apply", expr)
];

exports.HHCountTemporalExpression = (countExpr, expr) => [
   hhExpr("countApply", countExpr),
   " ",
   hhExpr("apply", expr)
];

exports.HHAccessor = (symb, id) => id ? [symb, ".", id] : [symb];
