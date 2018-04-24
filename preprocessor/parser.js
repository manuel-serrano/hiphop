"use hopscript"

const gen = require("./gen");

//
// http://www.ecma-international.org/ecma-262/5.1/#sec-A.5
//
// Some internal functions are called with `.call`. Arrow functions
// could be used to avoid that (since they statically bind this), but
// the parser does not yet support them. Hence, we could not bootstrap
// it if we use them.
//

function NYI() {
   throw new Error("Not Yet Implemented.");
}

function Parser(lexer, iFile, sourceMap) {
   this.hasHHcode = false;
   this.lexer = lexer;
   this.peekedTokens = [];
   this.iFile = iFile;
   this.sourceMap = sourceMap;
   this.genLine = 1;
   this.genColumn = 0;
}

exports.Parser = Parser;

Parser.prototype.map = function(token, generated) {
   return {
      sourceLine: token.line,
      sourceColumn: token.column,
      generated
   }
}

Parser.prototype.updateGeneratedLineColumn = function(code) {
   let i = 0;
   const len = code.length;

   while (i < len) {
      const c = code[i];
      if (c == "\n" || c == "\r") {
      	 this.genColumn = 0;
      	 this.gemLine++;
      } else {
      	 this.genColumn++;
      }
      i++;
   }
}

Parser.prototype._gen = function(generated) {
   let code = "";

   if (generated instanceof Array) {  // array from gen.js
      code = generated.reduce((acc, c) => acc + this._gen(c), code);
   } else if (generated instanceof Object) { // mapping from this.map()
      code += this.fillSourceMap(generated);
   } else if (generated !== undefined) { // code from gen.js
      this.updateGeneratedLineColumn(generated);
      code += generated;
   }

   return code;
}

const mapped = [];
Parser.prototype.fillSourceMap = function(mapping) {
   let code = "";

   if (mapped.indexOf(mapping) > -1) {
      console.log("========= DUPLICATE =========");
      console.log(this.genLine, this.genColumn);
      console.log("         -----------");
      console.log(mapping);
      console.log("=============================");
   }
   mapped.push(mapping);
   mapping.__mappedLine = this.genLine;
   mapping.__mappedColumn = this.genColumn;
   this.sourceMap.addMapping({
      generated: { line: this.genLine, column: this.genColumn},
      source: this.iFile,
      original: { line: mapping.sourceLine, column: mapping.sourceColumn }
   });
   console.log(`${mapping.sourceLine}:${mapping.sourceColumn} => ${this.genLine}:${this.genColumn}`);

   return this._gen(mapping.generated);
}

Parser.prototype.unexpectedToken = function(token=null, expected=null) {
   let got = token.value ? token.value : token.type;

   if (expected) {
      throw new Error(`${this.iFile} at ${token.line}:${token.column} expected ${expected} got ${got}`);
   } else {
      throw new Error(`${this.iFile} at ${token.line}:${token.column} unexpected ${got}`);
   }
}

Parser.prototype.gen = function() {
   console.error(`>>> HIPHOP.JS preprocessing ${this.iFile}`);
   const code = this._gen(this.__sourceElements());
   console.error(`<<< HIPHOP.JS preprocessing ${this.iFile}`);
   return code;
}

Parser.prototype.peek = function(lookahead=0) {
   let len = this.peekedTokens.length;
   let newLine = false;

   while (len < lookahead + 1) {
      let token;

      while ((token = this.lexer.token()).type == "NEWLINE") {
	 newLine = true;
      }

      if (newLine) {
	 newLine = false;
	 token.newLine = true;
      } else {
	 token.newLine = false;
      }
      this.peekedTokens.unshift(token);
      len++;
   }
   return this.peekedTokens[len - 1 - lookahead];
}

Parser.prototype.peekIsReserved = function(value=null) {
   let hasType = this.peekHasType("RESERVED");

   return value ? hasType && this.peekHasValue(value) : hasType
}

Parser.prototype.peekIsIdentifier = function() {
   return this.peekHasType("IDENTIFIER");
}

Parser.prototype.peekIsLiteral = function() {
   return this.peekHasType("LITERAL");
}

Parser.prototype.peekHasValue = function(value) {
   return this.peek().value == value;
}

Parser.prototype.peekHasType = function(type) {
   return this.peek().type == type;
}

Parser.prototype.consume = function(type=null, value=null) {
   const token = this.peek();

   if (type && type != token.type) {
      this.unexpectedToken(token, value ? value : type);
   }
   return this.peekedTokens.pop();
}

Parser.prototype.consumeReserved = function(value=null) {
   return this.consume("RESERVED", value);
}

Parser.prototype.consumeHHReserved = function(value=null) {
   return this.consume("HHRESERVED", value);
}

Parser.prototype.consumeOptionalEmpty = function() {
   if (this.peek().type == ";") {
      this.consume();
   }
}

//
// Hiphop.js extension
//

Parser.prototype.__hhBlock = function(brackets=true) {
   let stmts = [];
   let varDecls = [];
   const token = this.peek();

   if (brackets) {
      this.consume("{");
   }

   while (this.peek().value == "LET") {
      let peeked = this.peek();

      peeked.type = "RESERVED";
      peeked.value = "let"
      varDecls.push(this.__variableStatement("let"));
   }

   while (this.peek().type != "}") {
      stmts.push(this.__hhStatement());
      this.consumeOptionalEmpty();
   }

   if (brackets) {
      this.consume("}");
   }
   return this.map(token, gen.HHBlock(varDecls, gen.HHSequence(stmts)));
}

function signalDeclaration(accessibility) {
   let initExpr = null;
   let combineExpr = null;
   const token = this.peek();
   let id = this.__identifier();

   if (this.peek().type == "(") {
      this.consume("(");
      initExpr = this.__expression();
      this.consume(")");
   }

   if (this.peek().value == "COMBINE") {
      this.consumeHHReserved("COMBINE");
      this.consume("(");
      if (this.peek().value == "function") {
	 combineExpr = {func: this.__functionExpression()}
      } else {
	 combineExpr = {identifier: this.__identifier()}
      }
      this.consume(")");
   }

   return this.map(token, gen.Signal(id, accessibility, initExpr, combineExpr));
}

function signalDeclarationList(declList, accessibility=undefined) {
   let coma = false;

   if (accessibility) {
      this.consumeHHReserved(accessibility);
   }

   while ((accessibility
	   && this.peek().type != ";"
	   && this.peek().type != "RESERVED"
	   && this.peek().type != "HHRESERVED")
	  || (!accessibility
	      && this.peek().type != "{"
	      && this.peek().type != ";")) {

      if (coma) {
	 this.consume(",");
	 coma = false;
      }

      declList.push(signalDeclaration.call(this, accessibility));
      coma = true;
   }
}

Parser.prototype.__hhModule = function() {
   let id = null;
   let declList = [];
   let stmts;
   const token = this.peek();

   this.consumeHHReserved("MODULE");
   if (this.peek().type == "IDENTIFIER") {
      id = this.__identifier();
   }

   //
   // New interface declaration, where signal are declared as
   // module arguments
   //
   if (this.peek().type == "(") {
      let coma = false;
      this.consume();
      while(this.peek().type != ")") {
	 if (coma) {
	    this.consume(",");
	    coma = false;
	 }
	 let accessibility = this.peek().value;
	 if (accessibility == "IN"
	     || accessibility == "OUT"
	     || accessibility == "INOUT") {
	    declList.push(signalDeclaration.call(this, this.consume().value));
	    coma = true;
	 } else {
	    break;
	 }
      }
      this.consume(")");
   }

   this.consume("{");
   for (;;) {
      //
      // Old interface declaration, where signal are declared in the
      // module body
      //
      let accessibility = this.peek().value;
      if (accessibility == "IN"
	  || accessibility == "OUT"
	  || accessibility == "INOUT") {
	 signalDeclarationList.call(this, declList, accessibility);
	 this.consumeOptionalEmpty();
      } else {
	 break;
      }
   }
   stmts = this.__hhBlock(false);
   this.consume("}");
   return this.map(token, gen.HHModule(id, declList, stmts));
}

Parser.prototype.__hhLocal = function() {
   let declList = [];
   const token = this.peek();

   this.consumeHHReserved("LOCAL");
   signalDeclarationList.call(this, declList);
   return this.map(token, gen.HHLocal(declList, this.__hhBlock()));
}

Parser.prototype.__hhHalt = function() {
   return this.map(this.consumeHHReserved("HALT"), gen.HHHalt());
}

Parser.prototype.__hhPause = function() {
   return this.map(this.consumeHHReserved("PAUSE"), gen.HHPause());
}

Parser.prototype.__hhNothing = function() {
   return this.map(this.consumeHHReserved("NOTHING"), gen.HHNothing());
}

Parser.prototype.__hhIf = function() {
   let test;
   let thenBody;
   let elseBody = "";
   const token = this.consumeHHReserved("IF");

   this.consume("(");
   test = this.__expression();
   this.consume(")");
   thenBody = this.__hhBlock();

   if (this.peek().value == "ELSE") {
      this.consumeHHReserved("ELSE");
      if (this.peek().value == "IF") {
	 elseBody = this.__hhIf();
      } else {
	 elseBody = this.__hhBlock();
      }
   }

   return this.map(token, gen.HHIf(test, thenBody, elseBody));
}

Parser.prototype.__hhFork = function() {
   let branches = [];
   let forkId = undefined;
   const token = this.consumeHHReserved("FORK");

   if (this.peek().type == "IDENTIFIER") {
      forkId = this.__identifier();
   }
   branches.push(this.__hhBlock());
   while (this.peekHasValue("PAR")) {
      this.consume();
      branches.push(this.__hhBlock());
   }
   return this.map(token, gen.HHFork(branches, forkId));
}

Parser.prototype.__hhAbort = function() {
   return this.map(this.consumeHHReserved("ABORT"),
		   gen.HHAbort(this.__hhTemporalExpression(),
			       this.__hhBlock()));
}

Parser.prototype.__hhWeakAbort = function() {
   return this.map(this.consumeHHReserved("WEAKABORT"),
		   gen.HHWeakAbort(this.__hhTemporalExpression(),
				   this.__hhBlock()));
}

Parser.prototype.__hhLoop = function() {
   return this.map(this.consumeHHReserved("LOOP"),
		   gen.HHLoop(this.__hhBlock()));
}

Parser.prototype.__hhEvery = function() {
   let texpr;
   let body;
   const token = this.consumeHHReserved("EVERY");

   texpr = this.__hhTemporalExpression();
   body = this.__hhBlock();
   return this.map(token, gen.HHEvery(texpr, body));
}

Parser.prototype.__hhLoopeach = function() {
   let texpr;
   let body;
   const token = this.consumeHHReserved("LOOPEACH");

   texpr = this.__hhTemporalExpression();
   body = this.__hhBlock();
   return this.map(token, gen.HHLoopeach(texpr, body));
}

Parser.prototype.__hhAwait = function() {
   return this.map(this.consumeHHReserved("AWAIT"),
		   gen.HHAwait(this.__hhTemporalExpression()));
}

Parser.prototype.__emitArguments = function() {
   function emitArg() {
      const token = this.peek();
      let id = this.__identifier();
      let expr = null;

      if (this.peek().type == "(") {
	 this.consume();
	 expr = this.__expression();
	 this.consume(")");
      }
      return this.map(token, gen.HHEmitExpr(id, expr));
   }

   let args = [];

   for (;;) {
      let peeked;

      args.push(emitArg.call(this));
      peeked = this.peek();
      if (peeked.value == ";"
	  || peeked.newLine
	  || peeked.type == ")") /* FOR case */ {
	 this.consumeOptionalEmpty();
	 break;
      }
      this.consume(",");
   }
   return args;
}

Parser.prototype.__hhEmit = function() {
   return this.map(this.consumeHHReserved("EMIT"),
		   gen.HHEmit(this.__emitArguments()));
}

Parser.prototype.__hhSustain = function() {
   return this.map(this.consumeHHReserved("SUSTAIN"),
		   gen.HHSustain(this.__emitArguments()));
}

Parser.prototype.__hhTrap = function() {
   return this.map(this.consumeHHReserved("TRAP"),
		   gen.HHTrap(this.__identifier(), this.__hhBlock()));
}

Parser.prototype.__hhExit = function() {
   return this.map(this.consumeHHReserved("EXIT"),
		   gen.HHExit(this.__identifier()));
}

Parser.prototype.__hhExecParameters = function() {
   let params = {
      ONKILL: null,
      ONFIRSTSUSP: null,
      ONSUSP: null,
      ONFIRSTRES: null,
      ONRES: null
   };
   const token = this.peek();

   for (;;) {
      let param = this.peek().value;

      if (param == "ONKILL" || param == "ONFIRSTSUSP" || param == "ONSUSP"
	  || param == "ONFIRSTRES" || param == "ONRES") {
	 if (params[param]) {
	    throw new Error(`HIPHOP: at ${this.peek().pos} ` +
			    `parameter ${param} already used`);
	 }
	 this.consumeHHReserved(param);
	 params[param] = this.__expression();
      } else {
	 break;
      }
   }
   return this.map(token, gen.HHExecParams(params));
}

Parser.prototype.__hhExec = function() {
   return this.map(this.consumeHHReserved("EXEC"),
		   gen.HHExec(this.__expression(), this.__hhExecParameters()));
}

Parser.prototype.__hhExecAssign = function() {
   return this.map(this.consumeHHReserved("EXECASSIGN"),
		   gen.HHExecAssign(this.__identifier(),
				    this.__expression(),
				    this.__hhExecParameters()));
}

Parser.prototype.__hhExecEmit = function() {
   return this.map(this.consumeHHReserved("EXECEMIT"),
		   gen.HHExecEmit(this.__identifier(),
				  this.__expression(),
				  this.__hhExecParameters()));
}

Parser.prototype.__hhPromise = function() {
   const token = this.consumeHHReserved("PROMISE");
   const thenId = this.__identifier();
   this.consume(",");
   return this.map(token,
		   gen.HHPromise(thenId,
				 this.__identifier(),
				 this.__expression(),
				 this.__hhExecParameters()));
}

Parser.prototype.__hhRun = function() {
   let expr;
   let assocs = [];

   const token = this.consumeHHReserved("RUN");
   this.consume("(");
   expr = this.__assignmentExpression();
   while (this.peek().type != ")") {
      let calleeSignalId;
      let callerSignalId;

      this.consume(",");
      calleeSignalId = this.consume("IDENTIFIER").value;
      this.consume("=");
      callerSignalId = this.consume("IDENTIFIER").value
      assocs.push({calleeSignalId: calleeSignalId,
		   callerSignalId: callerSignalId});
   }
   this.consume(")");
   return this.map(token, gen.HHRun(expr, assocs));
}

Parser.prototype.__hhSuspend = function() {
   function emitWhenSuspended() {
      if (this.peek().value == "EMITWHENSUSPENDED") {
	 this.consume();
	 return this.consume("IDENTIFIER").value;
      }
      return null;
   }

   const token = this.consumeHHReserved("SUSPEND");

   if (this.peek().value == "FROM") {
      let from;
      let to;
      let immediate = false;

      this.consumeHHReserved("FROM");
      if (this.peek().value == "IMMEDIATE") {
	 this.consumeHHReserved("IMMEDIATE");
	 this.immediate = true;
      }
      this.consume("(");
      from = this.__expression();
      this.consume(")");
      this.consumeHHReserved("TO");
      this.consume("(");
      to = this.__expression();
      this.consume(")");
      let ews = emitWhenSuspended.call(this);
      return this.map(token, gen.HHSuspendFromTo(from,
						 to,
						 immediate,
						 this.__hhBlock(),
						 ews));
   } else if (this.peek().value == "TOGGLE") {
      let expr;

      this.consumeHHReserved("TOGGLE");
      this.consume("(");
      expr = this.__expression();
      this.consume(")");
      let ews = emitWhenSuspended.call(this);
      return this.map(token, gen.HHSuspendToggle(expr, this.__hhBlock(), ews));
   } else {
      let ews = emitWhenSuspended.call(this);
      return this.map(token, gen.HHSuspend(this.__hhTemporalExpression(),
					   this.__hhBlock(),
					   ews));
   }
}

Parser.prototype.__hhTemporalExpression = function(inFor=false) {
   const token = this.peek();
   if (token.value === "COUNT") {
      this.consumeHHReserved("COUNT");
      this.consume("(");
      const countExpr = this.__assignmentExpression();
      this.consume(",");
      const expr = this.__expression();
      this.consume(")");
      return this.map(token, gen.HHCountTemporalExpression(countExpr, expr));
   }

   let immediate = false;
   let count = false;
   let expr;

   if (token.value == "IMMEDIATE") {
      this.consumeHHReserved("IMMEDIATE");
      immediate = true;
   }

   if (!immediate && !inFor) {
      this.consume("(");
   }
   expr = this.__expression();
   if (!immediate && !inFor) {
      this.consume(")");
   }
   return this.map(token, gen.HHTemporalExpression(immediate, expr));
}

Parser.prototype.__hhAccessor = function() {
   let peeked = this.peek();
   let symb = peeked.value;

   function computeSymb(symb, reduc, needId=true) {
      let id = null;
      const token = this.consumeHHReserved(symb);

      if (needId) {
	 this.consume("(");
	 id = this.__identifier();
	 this.consume(")");
      }
      return this.map(token, gen.HHAccessor(`this.${reduc}`, id));
   }

   switch (symb) {
   case "VAL":
      return computeSymb.call(this, symb, "value");
   case "PREVAL":
      return computeSymb.call(this, symb, "preValue");
   case "PRE":
      return computeSymb.call(this, symb, "pre");
   case "NOW":
      return computeSymb.call(this, symb, "present");
   case "COMPLETE":
   case "DONE":
      return computeSymb.call(this, symb, "terminateExec", false);
   case "COMPLETEANDREACT":
   case "DONEREACT":
      return computeSymb.call(this, symb, "terminateExecAndReact", false);
   case "EXECID":
      return computeSymb.call(this, symb, "id", false);
   case "THIS":
      this.consume();
      return this.map(peeked, gen.HHAccessor("this.payload", null));
   default:
      this.unexpectedToken(peeked, "ACCESSOR");
   }
}

Parser.prototype.__hhAtom = function() {
   const token = this.consumeHHReserved("ATOM");
   if (this.peek().value != "{") {
      this.unexpectedToken(this.peek(), "{");
   }
   return this.map(token, gen.HHAtom(this.__statement()));
}

Parser.prototype.__hhWhile = function() {
   const token = this.consumeHHReserved("WHILE");
   const texpr = this.__hhTemporalExpression();
   const body = this.__hhBlock();
   return this.map(token, gen.HHWhile(texpr, body));
}

//
// TODO: for operands should be optional
//
Parser.prototype.__hhFor = function() {
   let declList = [];
   const token = this.consumeHHReserved("FOR");
   this.consume("(");
   signalDeclarationList.call(this, declList);
   this.consume(";");
   const whileExpr = this.__hhTemporalExpression(true);
   this.consume(";");
   const eachStmt = this.__hhStatement();
   this.consume(")");
   return this.map(token,
		   gen.HHFor(declList, whileExpr, eachStmt, this.__hhBlock()));
}

Parser.prototype.__hhSequence = function() {
   this.consumeHHReserved("SEQUENCE");
   if (this.peek().value != "{") {
      this.unexpectedToken(this.peek(), "{");
   }
   return this.__hhBlock();
}

Parser.prototype.__dollar = function() {
   let expr;

   const token = this.consume("IDENTIFIER", "$");
   this.consume("{");
   expr = this.__expression();
   this.consume("}");
   return this.map(token, gen.Dollar(expr));
}

Parser.prototype.__hhStatement = function() {
   let peeked = this.peek();

   switch (peeked.value) {
   case "MODULE":
      return this.__hhModule();
   case "HALT":
      return this.__hhHalt();
   case "PAUSE":
      return this.__hhPause();
   case "NOTHING":
      return this.__hhNothing();
   case "IF":
      return this.__hhIf();
   case "FORK":
      return this.__hhFork();
   case "ABORT":
      return this.__hhAbort();
   case "WEAKABORT":
      return this.__hhWeakAbort();
   case "EVERY":
      return this.__hhEvery();
   case "LOOP":
      return this.__hhLoop();
   case "LOOPEACH":
      return this.__hhLoopeach();
   case "AWAIT":
      return this.__hhAwait();
   case "EMIT":
      return this.__hhEmit();
   case "SUSTAIN":
      return this.__hhSustain();
   case "TRAP":
      return this.__hhTrap();
   case "EXIT":
      return this.__hhExit();
   case "EXEC":
      return this.__hhExec();
   case "EXECASSIGN":
      return this.__hhExecAssign();
   case "EXECEMIT":
      return this.__hhExecEmit();
   case "SUSPEND":
      return this.__hhSuspend();
   case "RUN":
      return this.__hhRun();
   case "SEQUENCE":
      return this.__hhSequence();
   case "ATOM":
      return this.__hhAtom();
   case "LOCAL":
      return this.__hhLocal();
   case "WHILE":
      return this.__hhWhile();
   case "FOR":
      return this.__hhFor();
   case "PROMISE":
      return this.__hhPromise();
   case "{":
      return this.__hhBlock();
   case "$":
      return this.__dollar();
   default:
      this.unexpectedToken(peeked);
   }
}

//
// Expressions
// http://www.ecma-international.org/ecma-262/5.1/#sec-A.3
//
// Note: most of the expressions clauses take inspiration from the
// Hop.js parser. See hop/js2scheme/parser.scm.
//

Parser.prototype.__primaryExpression = function() {
   let peeked = this.peek();

   switch (peeked.type) {
   case "RESERVED":
      switch (peeked.value) {
      case "this":
	 this.consume();
	 return this.map(peeked, gen.This());
      case "function":
	 return this.__functionExpression();
      case "service":
	 return this.__serviceExpression();
      default:
	 this.consume();
	 return this.map(peeked, gen.Unresolved(peeked.value));
      }
   case "IDENTIFIER":
      if (peeked.value == "$" && this.peek(1).value == "{") {
	 return this.__dollar();
      } else {
	 return this.__identifier();
      }
   case "LITERAL":
      //
      // For the purpose of this parser, we don't care of literal
      // kind, except for strings.
      //
      this.consume();
      return this.map(peeked, gen.Literal(peeked.value,
					  peeked.string,
					  peeked.template));
   case "[":
      return this.__arrayLiteral();
   case "{":
      return this.__objectLiteral();
   case "(":
      this.consume("(");
      let expr = this.__expression();
      this.consume(")");
      return expr;
   case "XML":
      return this.__xml();
   default:
      if (peeked.value == "VAL" || peeked.value == "PREVAL"
	  || peeked.value == "PRE" || peeked.value == "NOW"
	  || peeked.value == "COMPLETE" || peeked.value == "COMPLETEANDREACT"
	  || peeked.value == "DONE" || peeked.value == "DONEREACT"
	  || peeked.value == "EXECID" || peeked.value == "THIS") {
	 this.hasHHcode = true;
	 return this.__hhAccessor();
      } else {
	 this.hasHHcode = true;
	 return this.__hhStatement();
      }
   }
}

Parser.prototype.__xmlBody = function() {
   let els = [];
   const token = this.peek();

   for (;;) {
      let peeked = this.peek();

      if (peeked.type == "EOF") {
	 this.unexpectedToken(peeked, "</closing-xml-tag> (maybe)");
      } else if (peeked.type == "~") {
	 this.consume();
	 els.push(this.map(peeked, gen.Tilde(this.__block())));
      } else if (peeked.type == "XML") {
	 if (peeked.closing) {
	    break;
	 }
	 els.push(this.__xml());
      } else {
	 els.push(peeked);
	 this.consume();
      }
   }
   return this.map(token, gen.XMLBody(els));
}

Parser.prototype.__xml = function() {
   let openOrLeaf = this.consume("XML");

   if (openOrLeaf.openning) {
      let body = this.__xmlBody();
      let close = this.consume("XML");

      if (!close.closing) {
	 this.unexpectedToken(close, "</closing-xml-tag>");
      }
      return this.map(openOrLeaf, gen.XML(openOrLeaf.value, body, close.value));
   } else if (openOrLeaf.leaf) {
      return this.map(openOrLeaf, gen.XML(openOrLeaf.value));
   } else {
      this.unexpectedToken(openOrLeaf, "<openning-xml-tag>");
   }
}

Parser.prototype.__identifier = function() {
   //
   // For the purpose of this parser, we don't really care of
   // identifier kind (Nan, boolean, etc.)
   //
   let token = this.consume("IDENTIFIER");
   return this.map(token, gen.Identifier(token.value));
}

Parser.prototype.__arrayLiteral = function() {
   let pos = this.consume("[");
   let slots = [];
   let peeked = this.peek();

   for (;;) {
      let peeked = this.peek();

      if (peeked.type == "]") {
	 break;
      }

      if (peeked.type == ",") {
	 this.consume();
	 slots.push(this.map(peeked, gen.EmptySlot()));
      } else {
	 slots.push(this.__assignmentExpression());
	 if (this.peek().type != "]") {
	    this.consume(",");
	 }
      }
   }

   this.consume("]");
   return this.map(peeked, gen.ArrayLiteral(slots));
}

Parser.prototype.__objectLiteral = function() {
   let token = this.consume("{");
   let pos = token.pos;
   let props = [];
   let expectComa = false;

   for (;;) {
      let peeked = this.peek();

      if (peeked.type == "}") {
	 break;
      }

      if (peeked.type == ",") {
	 if (expectComa) {
	    this.consume();
	    expectComa = false;
	 } else {
	    this.unexpectedToken(peeked);
	 }
      } else if (expectComa) {
	 this.unexpectedToken(peeked, ",");
      } else {
	 props.push(this.__propertyAssignment());
	 expectComa = true;
      }
   }

   this.consume("}");
   return this.map(token, gen.ObjectLiteral(props));
}

Parser.prototype.__propertyAssignment = function() {
   let peeked = this.peek();

   if (peeked.value == "get") {
      let name;
      let body;

      this.consume();
      name = this.__propertyName();
      this.consume("(");
      this.consume(")");
      this.consume("{");
      body = this.__functionBody();
      this.consume("}");
      return this.map(peeked, gen.PropertyAssignmentGet(name, body));

   } else if (peeked.value == "set") {
      let name;
      let arg;
      let body;

      this.consume();
      name = this.__propertyName();
      this.consume("(");
      arg = this.__identifier();
      this.consume(")");
      this.consume("{");
      body = this.__functionBody();
      this.consume("}");
      return this.map(peeked, gen.PropertyAssignmentSet(name, arg, body));

   } else {
      let name = this.__propertyName();

      this.consume(":");
      return this.map(peeked,
		      gen.PropertyAssignment(name,
					     this.__assignmentExpression()));
   }
}

Parser.prototype.__propertyName = function() {
   let peeked = this.peek();

   if (peeked.type == "RESERVED"
       || peeked.type == "IDENTIFIER"
       || peeked.type == "LITERAL") {
      this.consume();
      return this.map(peeked, gen.Literal(peeked.value));
   }
   this.unexpectedToken("at " + peeked.pos + " wrong property name `" +
		   peeked.value + "`");
}

Parser.prototype.__newExpression = function() {
   const peeked = this.peek();
   if (this.peekIsReserved("new")) {
      let pos = this.consume().pos;
      let classOrExpr = this.__newExpression();
      let args = null;

      if (this.peek().type == "(") {
	 args = this.__arguments();
      }
      return this.map(peeked, gen.New(classOrExpr, args));
   } else {
      return this.__accessOrCall(this.__primaryExpression(), false);
   }
}

Parser.prototype.__accessOrCall = function(expr, callAllowed) {
   let peeked = this.peek();
   let pos = peeked.pos;

   if (peeked.type == "[") {
      this.consume();
      let field = this.__expression();
      this.consume();
      return this.__accessOrCall(this.map(peeked,
					  gen.AccessBracket(expr, field)),
				 callAllowed);
   } else if (peeked.type == ".") {
      this.consume();
      let field = this.__identifier();
      return this.__accessOrCall(this.map(peeked, gen.AccessDot(expr, field)),
				 callAllowed);
   } else if (peeked.type == "(" && callAllowed) {
      let args = this.__arguments();
      return this.__accessOrCall(this.map(peeked, gen.Call(expr, args)),
				 callAllowed);
   } else {
      return expr;
   }
}

Parser.prototype.__arguments = function() {
   let args = [];

   this.consume("(");
   while (!this.peekHasType(")")) {
      args.push(this.__assignmentExpression());
      if (this.peek().type != ")") {
	 this.consume(",");
      }
   }
   this.consume(")");

   return args;
}

Parser.prototype.__leftHandSideExpression = function() {
   return this.__accessOrCall(this.__newExpression(), true);
}

Parser.prototype.__postfixExpression = function() {
   let lhs = this.__leftHandSideExpression();
   let peeked = this.peek();

   if ((peeked.type == "++" || peeked.type == "--") && !peeked.newLine) {
      this.consume();
      return this.map(peeked, gen.Postfix(lhs, peeked.type));
   } else {
      return lhs;
   }
}

Parser.prototype.__unaryExpression = function() {
   let peeked = this.peek();

   if ((peeked.type == "RESERVED" && (peeked.value == "delete"
				      || peeked.value == "void"
				      || peeked.value == "typeof"))
       || ["+", "-", "~", "!"].indexOf(peeked.type) > -1) {
      this.consume();
      return this.map(peeked,
		      gen.Unary(peeked.value, this.__unaryExpression()));
   } else if (peeked.type == "++" || peeked.type == "--") {
      this.consume();
      return this.map(peeked,
		      gen.Prefix(peeked.type, this.__unaryExpression()));
   }
   return this.__postfixExpression();
}

Parser.prototype.__binaryExpression = function(withInKwd=true) {
   function getLevel(op) {
      switch(op.value) {
      case "||":
	 return 1;
      case "&&":
	 return 2;
      case "|":
	 return 3;
      case "^":
	 return 4;
      case "&":
	 return 5;
      case "==":
      case "!=":
      case "===":
      case "!==":
	 return 6;
      case "<":
      case ">":
      case "<=":
      case ">=":
      case "instanceof":
      case "in":
	 return 7;
      case "<<":
      case ">>":
      case ">>>":
	 return 8;
      case "+":
      case "-":
	 return 9;
      case "*":
      case "/":
      case "%":
	 return 10;
      default:
	 return false;
      }
   }

   function binary(level) {
      if (level > 10) {
	 return this.__unaryExpression();
      } else {
 	 let expr = binary.call(this, level + 1);
	 for (;;) {
	    let peeked = this.peek();
	    let newLevel = getLevel(peeked);

	    if (peeked.type == "in" && withInKwd) {
	       return expr;
	    } else if (!newLevel) {
	       return expr;
	    } else if (newLevel == level) {
	       let op = this.consume().value;
	       expr = this.map(
		  peeked,
		  gen.Binary(expr, op, binary.call(this, level + 1)));
	    } else {
	       return expr;
	    }
	 }
      }
   }

   return binary.call(this, 1);
}

Parser.prototype.__conditionalExpression = function(withInKwd=true) {
   let expr = this.__binaryExpression(withInKwd);
   let peeked = this.peek();

   if (peeked.type == "?") {
      this.consume();
      let then_ = this.__assignmentExpression(withInKwd);
      this.consume(":");
      let else_ = this.__assignmentExpression(withInKwd);
      return this.map(peeked, gen.Conditional(expr, then_, else_));
   } else {
      return expr;
   }
}

Parser.prototype.__assignmentExpression = function(withInKwd=true) {
   function isAssignOp(op) {
      return ["=", "*=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=",
	      "^=", "|="].indexOf(op) > -1;
   }

   let lhs = this.__conditionalExpression(withInKwd);
   if (isAssignOp(this.peek().type)) {
      const token = this.peek();
      let op = this.consume();
      let rhs = this.__assignmentExpression(withInKwd);
      return this.map(token, gen.Assign(lhs, op.value, rhs));
   } else {
      return lhs;
   }
}

Parser.prototype.__expression = function(withInKwd=true) {
   const token = this.peek();
   let pos = token.pos;
   let exprs = [this.__assignmentExpression(withInKwd)];

   for(;;) {
      if (!this.peekHasType(",")) {
	 break;
      }

      this.consume();
      exprs.push(this.__assignmentExpression(withInKwd));
   }
   return exprs.length == 1 ? exprs[0] : this.map(token, gen.Sequence(exprs));
}

//
// Statements
// http://www.ecma-international.org/ecma-262/5.1/#sec-A.4
//

Parser.prototype.__statement = function() {
   switch (this.peek().value) {
   case "{":
      return this.__block();
   case "var":
   case "const":
   case "let":
      return this.__variableStatement(this.peek().value);
   case ";":
      return this.__emptyStatement();
   case "if":
      return this.__ifStatement();
   case "for":
   case "while":
   case "do":
      return this.__iterationStatement();
   case "continue":
      return this.__continueStatement();
   case "break":
      return this.__breakStatement();
   case "return":
      return this.__returnStatement();
   case "with":
      return this.__withStatement();
   case "switch":
      return this.__switchStatement();
   case "throw":
      return this.__throwStatement();
   case "try":
      return this.__tryStatement();
   case "debugger":
      return this.__debuggerStatement();
   case "function":
      return this.__functionDeclaration();
   default:
      if (this.peek(1).type == ":") {
	 return this.__labelledStatement();
      } else {
	 return this.__expressionStatement();
      }
   }
}

Parser.prototype.__block = function() {
   let stmts = [];
   const token = this.consume("{");

   while (!this.peekHasType("}")) {
      stmts.push(this.__statement());
   }
   this.consume();
   return this.map(token, gen.Block(stmts));
}

Parser.prototype.__variableStatement = function(vtype) {
   let varStmt;
   const token = this.consumeReserved(vtype);

   varStmt = this.map(
      token,
      gen.VariableStmt(vtype, this.__variableDeclarationList()));
   this.consumeOptionalEmpty();
   return varStmt;
}

Parser.prototype.__variableDeclarationList = function(withInKwd=true) {
   let varDecls = [];

   for(;;) {
      let peeked = this.peek();

      if (peeked.newLine || peeked.type == ";" || peeked.type == "EOF") {
	 break;
      } else if (peeked.type == ",") {
	 this.consume();
      } else if (peeked.value == "in" && !withInKwd) {
	 break;
      }
      varDecls.push(this.__variableDeclaration(withInKwd));
   }
   return varDecls;
}

Parser.prototype.__variableDeclaration = function(withInKwd=true) {
   const token = this.peek();
   let id = this.__identifier();
   let init = "";

   if (this.peekHasType("=")) {
      this.consume();
      init = this.__assignmentExpression(withInKwd);
   }
   return this.map(token, gen.VariableDeclaration(id, init));
}

Parser.prototype.__emptyStatement = function() {
   return this.map(this.consume(), gen.EmptyStatement());
}

Parser.prototype.__expressionStatement = function() {
   let peeked = this.peek();
   let expression = "";

   if (peeked.type == "{"
       || peeked.type == "function"
       || peeked.type == "service") {
      this.unexpectedToken(peeked, "expression");
   }
   expression = this.__expression(false);
   this.consumeOptionalEmpty();
   return this.map(peeked, gen.ExpressionStatement(expression));
}

Parser.prototype.__ifStatement = function() {
   let test = "";
   let then_ = "";
   let else_ = "";
   const token = this.consumeReserved("if");

   this.consume("(");
   test = this.__expression();
   this.consume(")");
   then_ = this.__statement();
   if (this.peekHasValue("else")) {
      this.consume();
      else_ = this.__statement();
   }
   return this.map(token, gen.If(test, then_, else_));
}

Parser.prototype.__iterationStatement = function() {
   let test;
   let stmt;
   const token = this.peek();

   switch (token.value) {
   case "do":
      this.consume();
      stmt = this.__statement();
      this.consumeReserved("while");
      this.consume("(");
      test = this.__expression();
      this.consume(")");
      this.consumeOptionalEmpty();
      return this.map(token, gen.Do(test, stmt));
   case "while":
      this.consume();
      this.consume("(");
      test = this.__expression();
      this.consume(")");
      return this.map(token, gen.While(test, this.__statement()));
   case "for":
      let forInExpr = "";
      let vtype = "";
      let initVarDecl = "";
      let init = "";
      let test = "";
      let after = "";
      let stmt = "";

      this.consume();
      this.consume("(");

      if (this.peekHasValue("var")
	  || this.peekHasValue("const")
	  || this.peekHasValue("let")) {
	 vtype = this.consume().value;
	 //
	 // More permissive than the specification: a
	 // VariableDeclarationList is used for both for and for-in
	 // whereas for-in should use a VariableDeclaration.
	 //
	 // http://www.ecma-international.org/ecma-262/5.1/#sec-12.6
	 //
	 initVarDecl = this.__variableDeclarationList(false);
      } else {
	 //
	 // More permissive than the specification: an Expression
	 // clause is used in both for and for-in whereas for-in
	 // should use a LeftHandSideExpression.
	 //
	 // http://www.ecma-international.org/ecma-262/5.1/#sec-12.6
	 //
	 if (this.peek().type != ";") {
	    init = this.__expression();
	 }
      }

      if (this.peekIsReserved("in")) {
	 this.consume()
	 forInExpr = this.__expression();
      } else {
	 this.consume(";");
	 if (!this.peekHasType(";")) {
	    test = this.__expression();
	 }
	 this.consume(";")
	 if (!this.peekHasType(")")) {
	    after = this.__expression();
	 }
      }
      this.consume(")");
      stmt = this.__statement();

      return this.map(token,
		      forInExpr
		      ? gen.ForIn(vtype, initVarDecl, forInExpr, stmt)
		      : gen.For(vtype, initVarDecl, init, test, after, stmt));
   }
}

Parser.prototype.__continueStatement = function() {
   let identifier = "";
   const token = this.consumeReserved("continue");
   let pos = token.pos;
   let peeked = this.peek();

   if (peeked.type == "IDENTIFIER" && !peeked.newLine) {
      identifier = this.__identifier();
   }
   this.consumeOptionalEmpty();

   return this.map(token, gen.Continue(identifier));
}

Parser.prototype.__breakStatement = function() {
   let identifier = "";
   const token = this.consumeReserved("break");
   let pos = token.pos;
   let peeked = this.peek();

   if (peeked.type == "IDENTIFIER" && !peeked.newLine) {
      identifier = this.__identifier();
   }
   this.consumeOptionalEmpty();

   return this.map(token, gen.Break(identifier));
}

Parser.prototype.__returnStatement = function() {
   let expr = "";
   const token = this.consumeReserved("return");
   let pos = token.pos;
   let peeked = this.peek();

   if (peeked.type != ";" && !peeked.newLine) {
      expr = this.__expression();
   }
   this.consumeOptionalEmpty();

   return this.map(token, gen.Return(expr));
}

//
// TODO: Should trigger an error in strict mode
// http://www.ecma-international.org/ecma-262/5.1/#sec-12.10
//
Parser.prototype.__withStatement = function() {
   let expr = "";
   let stmt = "";
   const token = this.consumeReserved("with");
   let pos = token.pos;

   this.consume("(");
   expr = this.__expression();
   this.consume(")");
   stmt = this.__statement();
   return this.map(token, gen.With(expr, stmt));
}

Parser.prototype.__switchStatement = function() {
   let expr = null;
   let caseBlock = null;
   const token = this.consumeReserved("switch");
   let pos = token.pos;

   this.consume("(");
   expr = this.__expression();
   this.consume(")");
   caseBlock = this.__caseBlock();
   return this.map(token, gen.Switch(expr, caseBlock));
}

Parser.prototype.__caseBlock = function() {
   let defaultUsed = false;
   let clauses = [];
   const token = this.consume("{");
   let pos = token.pos;

   for (;;) {
      let peeked = this.peek();

      if (peeked.type == "}") {
	 break;
      } else if (peeked.value == "case") {
	 clauses.push(this.__caseClause());
      } else if (peeked.value == "default") {
	 if (defaultUsed) {
	    throw new Error(`at ${peeked.pos} only one default clause allowed`);
	 }
	 defaultUsed = true;
	 clauses.push(this.__defaultClause());
      } else {
	 this.unexpectedToken(peeked);
      }
   }

   this.consume("}");
   return this.map(token, gen.CaseBlock(clauses));
}

Parser.prototype.__caseClause = function() {
   let pos = this.consumeReserved("case");
   let expr = this.__expression();
   let stmts = [];

   this.consume(":");
   for (;;) {
      let peeked = this.peek();
      if (peeked.type == "}"
	  || (peeked.type == "RESERVED"
	      && (peeked.value == "case" || peeked.value == "default"))) {
	 break;
      }
      stmts.push(this.__statement());
   }
   return this.map(pos, gen.CaseClause(expr, stmts));
}

Parser.prototype.__defaultClause = function() {
   let pos = this.consumeReserved("default");
   let stmts = [];

   this.consume(":");
   for (;;) {
      let peeked = this.peek();
      if (peeked.type == "}"
	  || (peeked.type == "RESERVED"
	      && (peeked.value == "case" || peeked.value == "default"))) {
	 break;
      }
      stmts.push(this.__statement());
   }
   return this.map(pos, gen.DefaultClause(stmts));
}

Parser.prototype.__labelledStatement = function() {
   const token = this.peek();
   let identifier = this.__identifier();

   this.consume(";");
   return this.map(token, gen.LabelledStmt(identifier, this.__statement()));
}

Parser.prototype.__throwStatement = function() {
   let expr = "";
   const token = this.consumeReserved("throw");

   expr = this.__expression();
   this.consumeOptionalEmpty();
   return this.map(token, gen.Throw(expr));
}

Parser.prototype.__tryStatement = function() {
   return this.map(this.consumeReserved("try"),
		   gen.Try(this.__block(), this.__catch(), this.__finally()));
}

Parser.prototype.__catch = function() {
   let identifier = "";
   const token = this.consume("catch");

   this.consume("(");
   identifier = this.__identifier();
   this.consume(")");
   return this.map(token, gen.Catch(identifier, this.__block()));
}

Parser.prototype.__finally = function() {
   return this.map(this.consumeReserved("finally"),
		   gen.Finally(this.__block()));
}

Parser.prototype.__debugger = function() {
   const token = this.consumeReserved("debugger");
   this.consumeOptionalEmpty();
   return this.map(token, gen.Debugger());
}

//
// Functions and Programs
// http://www.ecma-international.org/ecma-262/5.1/#sec-A.5
//

Parser.prototype.__functionDeclaration = function(expr=false) {
   let id = "";
   let params = "";
   let body = "";

   const token = this.consumeReserved();
   if (!expr || (expr && this.peekIsIdentifier())) {
      id = this.__identifier();
   }

   this.consume("(");
   params = this.__formalParameterList();
   this.consume(")");

   this.consume("{");
   body = this.__functionBody();
   this.consume("}");
   return this.map(token, (expr
			   ? gen.FunctionExpression(id, params, body)
			   : gen.FunctionDeclaration(id, params, body)))
}

Parser.prototype.__functionExpression = function() {
   return this.__functionDeclaration(true);
}

Parser.prototype.__serviceDeclaration = function(expr=false) {
   let id = "";
   let params = "";
   let body = "";

   const token = this.consumeReserved();
   if (!expr || (expr && this.peekIsIdentifier())) {
      id = this.__identifier();
   }

   this.consume("(");
   params = this.__formalParameterList();
   this.consume(")");

   if (this.peek().type == "{") {
      this.consume("{");
      body = this.__functionBody();
      this.consume("}");
   } else {
      this.consumeOptionalEmpty();
   }

   return this.map(token, (expr
			   ? gen.ServiceExpression(id, params, body)
			   : gen.ServiceDeclaration(id, params, body)));
}

Parser.prototype.__serviceExpression = function() {
   return this.__serviceDeclaration(true);
}

Parser.prototype.__formalParameterList = function() {
   let params = [];
   let iter = false;

   while (!this.peekHasType(")")) {
      const token = this.peek();
      let id = this.__identifier();
      let initExpr = null;

      if (this.peekHasType("=")) {
	 this.consume();
	 initExpr = this.__assignmentExpression();
      }
      params.push(this.map(token, gen.Parameter(id, initExpr)));
      if (!this.peekHasType(")")) {
	 this.consume(",");
      }
   }
   return params;
}

Parser.prototype.__functionBody = function() {
   return this.__sourceElements(true);
}

Parser.prototype.__sourceElements = function(fn=false) {
   let els = [];
   const token = this.peek();

   for (;;) {
      let tokenType = this.peek().type;

      if ((!fn && tokenType == "EOF") || (fn && tokenType == "}")) {
	 break;
      }
      els.push(this.__sourceElement());
   }
   return gen.Program(els);
}

Parser.prototype.__sourceElement = function() {
   let peeked = this.peek();

   switch (peeked.value) {
   case "EOF":
      this.unexpectedToken(peeked);
   case "function":
      return this.__functionDeclaration();
   case "service":
      return this.__serviceDeclaration();
   default:
      return this.__statement();
   }
}
