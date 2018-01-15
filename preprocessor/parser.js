"use hopscript"

const ast = require("./ast");

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

function unexpectedToken(token=null, expected=null) {
   let got = token.value ? token.value : token.type;

   if (expected) {
      throw new Error(`at ${token.pos} expected ${expected} got ${got}`);
   } else {
      throw new Error(`at ${token.pos} unexpected ${got}`);
   }
}

function Parser(lexer) {
   this.lexer = lexer;
   this.peekedTokens = [];
}

exports.Parser = Parser;

Parser.prototype.generateAST = function() {
   return this.__sourceElements();
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
   let token = this.peek();

   if (type && type != token.type) {
      unexpectedToken(token, value ? value : type);
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

function unexpectedHHToken(token=null, expected=null) {
   let got = token.value ? token.value : token.type;

   if (expected) {
      throw new Error(`HIPHOP at ${token.pos} expected ${expected} got ${got}`);
   } else {
      throw new Error(`HIPHOP at ${token.pos} unexpected ${got}`);
   }
}

Parser.prototype.__hhBlock = function(brackets=true) {
   let stmts = [];
   let varDecls = [];

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
   return ast.HHBlock(varDecls, ast.HHSequence(stmts));
}

function signalDeclarationList(declList, accessibility=null) {
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
      let initExpr = null;
      let combineExpr = null;
      let id;

      if (coma) {
	 this.consume(",");
	 coma = false;
      }

      id = this.__identifier();
      if (this.peek().type == "(") {
	 this.consume("(");
	 initExpr = this.__expression();
	 this.consume(")");
      }

      if (this.peek().type == "COMBINE") {
	 this.consumeHHReserved("COMBINE");
	 this.consume("(");
	 if (this.peek().value == "function") {
	    this.combineExpr = this.__functionExpression();
	 } else {
	    this.combineExpr = this.__identifier();
	 }
	 this.consume(")");
      }

      declList.push(ast.Signal(id, accessibility, initExpr, combineExpr));
      coma = true;
   }
}

Parser.prototype.__hhModule = function() {
   let id = null;
   let declList = [];
   let stmts;

   this.consumeHHReserved("MODULE");
   if (this.peek().type == "IDENTIFIER") {
      id = this.__identifier();
   }
   this.consume("{");
   for (;;) {
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
   return ast.HHModule(id, declList, stmts);
}

Parser.prototype.__hhLocal = function() {
   let declList = [];

   this.consumeHHReserved("LOCAL");
   signalDeclarationList.call(this, declList);
   return ast.HHLocal(declList, this.__hhBlock());
}

Parser.prototype.__hhHalt = function() {
   this.consumeHHReserved("HALT");
   return ast.HHHalt();
}

Parser.prototype.__hhPause = function() {
   this.consumeHHReserved("PAUSE");
   return ast.HHPause();
}

Parser.prototype.__hhNothing = function() {
   this.consumeHHReserved("NOTHING");
   return ast.HHNothing();
}

Parser.prototype.__hhIf = function() {
   let test;
   let thenBody;
   let elseBody = null;

   this.consumeHHReserved("IF");
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

   return ast.HHIf(test, thenBody, elseBody);
}

Parser.prototype.__hhFork = function() {
   let branches = [];
   let forkId = undefined;

   this.consumeHHReserved("FORK");
   if (this.peek().type == "IDENTIFIER") {
      forkId = this.__identifier();
   }
   branches.push(this.__hhBlock());
   while (this.peekHasValue("PAR")) {
      this.consume();
      branches.push(this.__hhBlock());
   }
   return ast.HHFork(branches, forkId);
}

Parser.prototype.__hhAbort = function() {
   this.consumeHHReserved("ABORT");
   return ast.HHAbort(this.__hhTemporalExpression(), this.__hhBlock());
}

Parser.prototype.__hhWeakAbort = function() {
   this.consumeHHReserved("WEAKABORT");
   return ast.HHWeakAbort(this.__hhTemporalExpression(), this.__hhBlock());
}

Parser.prototype.__hhLoop = function() {
   this.consumeHHReserved("LOOP");
   return ast.HHLoop(this.__hhBlock());
}

Parser.prototype.__hhEvery = function() {
   let texpr;
   let body;

   this.consumeHHReserved("EVERY");
   texpr = this.__hhTemporalExpression();
   body = this.__hhBlock();
   return ast.HHEvery(texpr, body);
}

Parser.prototype.__hhLoopeach = function() {
   let texpr;
   let body;

   this.consumeHHReserved("LOOPEACH");
   texpr = this.__hhTemporalExpression();
   body = this.__hhBlock();
   return ast.HHLoopeach(texpr, body);
}

Parser.prototype.__hhAwait = function() {
   this.consumeHHReserved("AWAIT");
   return ast.HHAwait(this.__hhTemporalExpression());
}

Parser.prototype.__emitArguments = function() {
   function emitArg() {
      let id = this.__identifier();
      let expr = null;

      if (this.peek().type == "(") {
	 this.consume();
	 expr = this.__expression();
	 this.consume(")");
      }
      return ast.HHEmitExpr(id, expr);
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
   this.consumeHHReserved("EMIT");
   return ast.HHEmit(this.__emitArguments());
}

Parser.prototype.__hhSustain = function() {
   this.consumeHHReserved("SUSTAIN");
   return ast.HHSustain(this.__emitArguments());
}

Parser.prototype.__hhTrap = function() {
   this.consumeHHReserved("TRAP");
   return ast.HHTrap(this.__identifier(), this.__hhBlock());
}

Parser.prototype.__hhExit = function() {
   this.consumeHHReserved("EXIT");
   return ast.HHExit(this.__identifier());
}

Parser.prototype.__hhExecParameters = function() {
   let params = {
      ONKILL: null,
      ONFIRSTSUSP: null,
      ONSUSP: null,
      ONFIRSTRES: null,
      ONRES: null
   };

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
   return ast.HHExecParams(params);
}

Parser.prototype.__hhExec = function() {
   this.consumeHHReserved("EXEC");
   return ast.HHExec(this.__expression(), this.__hhExecParameters());
}

Parser.prototype.__hhExecAssign = function() {
   this.consumeHHReserved("EXECASSIGN");
   return ast.HHExecAssign(this.__identifier(),
			   this.__expression(),
			   this.__hhExecParameters());
}

Parser.prototype.__hhExecEmit = function() {
   this.consumeHHReserved("EXECEMIT");
   return ast.HHExecEmit(this.__identifier(),
			 this.__expression(),
			 this.__hhExecParameters());
}

Parser.prototype.__hhPromise = function() {
   this.consumeHHReserved("PROMISE");
   const thenId = this.__identifier();
   this.consume(",");
   return ast.HHPromise(thenId,
			this.__identifier(),
			this.__expression());
}

Parser.prototype.__hhRun = function() {
   let expr;
   let assocs = [];

   this.consumeHHReserved("RUN");
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
   return ast.HHRun(expr, assocs);
}

Parser.prototype.__hhSuspend = function() {
   function emitWhenSuspended() {
      if (this.peek().value == "EMITWHENSUSPENDED") {
	 this.consume();
	 return this.consume("IDENTIFIER").value;
      }
      return null;
   }

   this.consumeHHReserved("SUSPEND");

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
      return ast.HHSuspendFromTo(from, to, immediate, this.__hhBlock(), ews);
   } else if (this.peek().value == "TOGGLE") {
      let expr;

      this.consumeHHReserved("TOGGLE");
      this.consume("(");
      expr = this.__expression();
      this.consume(")");
      let ews = emitWhenSuspended.call(this);
      return ast.HHSuspendToggle(expr, this.__hhBlock(), ews);
   } else {
      let ews = emitWhenSuspended.call(this);
      return ast.HHSuspend(this.__hhTemporalExpression(), this.__hhBlock(), ews);
   }
}

Parser.prototype.__hhTemporalExpression = function(inFor=false) {
   let immediate = false;
   let expr;
   if (this.peek().value == "IMMEDIATE") {
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
   return ast.HHTemporalExpression(immediate, expr);
}

Parser.prototype.__hhAccessor = function() {
   let peeked = this.peek();
   let symb = peeked.value;

   function computeSymb(symb, reduc, needId=true) {
      let id = null;

      this.consumeHHReserved(symb);
      if (needId) {
	 this.consume("(");
	 id = this.__identifier();
	 this.consume(")");
      }
      return ast.HHAccessor(`this.${reduc}`, id);
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
   default:
      unexpectedHHToken(peeked, "ACCESSOR");
   }
}

Parser.prototype.__hhAtom = function() {
   this.consumeHHReserved("ATOM");
   if (this.peek().value != "{") {
      unexpectedHHToken(this.peek(), "{");
   }
   return ast.HHAtom(this.__statement());
}

Parser.prototype.__hhWhile = function() {
   this.consumeHHReserved("WHILE");
   const texpr = this.__hhTemporalExpression();
   const body = this.__hhBlock();
   return ast.HHWhile(texpr, body);
}

//
// TODO: for operands should be optional
//
Parser.prototype.__hhFor = function() {
   let declList = [];
   this.consumeHHReserved("FOR");
   this.consume("(");
   signalDeclarationList.call(this, declList);
   this.consume(";");
   const whileExpr = this.__hhTemporalExpression(true);
   this.consume(";");
   const eachStmt = this.__hhStatement();
   this.consume(")");
   return ast.HHFor(declList, whileExpr, eachStmt, this.__hhBlock());
}

Parser.prototype.__hhSequence = function() {
   this.consumeHHReserved("SEQUENCE");
   if (this.peek().value != "{") {
      unexpectedHHToken(this.peek(), "{");
   }
   return this.__hhBlock();
}

Parser.prototype.__dollar = function() {
   let expr;

   this.consume("IDENTIFIER", "$");
   this.consume("{");
   expr = this.__expression();
   this.consume("}");
   return ast.Dollar(expr);
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
      unexpectedHHToken(peeked);
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
	 return ast.This();
      case "function":
	 return this.__functionExpression();
      case "service":
	 return this.__serviceExpression();
      default:
	 this.consume();
	 return ast.Unresolved(peeked.value);
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
      return ast.Literal(peeked.value, peeked.string, peeked.template);
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
	  || peeked.value == "EXECID") {
	 return this.__hhAccessor();
      } else {
	 return this.__hhStatement();
      }
   }
}

Parser.prototype.__xmlBody = function() {
   let els = [];

   for (;;) {
      let peeked = this.peek();

      if (peeked.type == "EOF") {
	 unexpectedToken(peeked, "</closing-xml-tag> (maybe)");
      } else if (peeked.type == "~") {
	 this.consume();
	 els.push(ast.Tilde(this.__block()));
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
   return ast.XMLBody(els);
}

Parser.prototype.__xml = function() {
   let openOrLeaf = this.consume("XML");

   if (openOrLeaf.openning) {
      let body = this.__xmlBody();
      let close = this.consume("XML");

      if (!close.closing) {
	 unexpectedHHToken(close, "</closing-xml-tag>");
      }
      return ast.XML(openOrLeaf.value, body, close.value);
   } else if (openOrLeaf.leaf) {
      return ast.XML(openOrLeaf.value);
   } else {
      unexpectedToken(openOrLeaf, "<openning-xml-tag>");
   }
}

Parser.prototype.__identifier = function() {
   //
   // For the purpose of this parser, we don't really care of
   // identifier kind (Nan, boolean, etc.)
   //
   let token = this.consume("IDENTIFIER");
   return ast.Identifier(token.value);
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
	 slots.push(ast.EmptySlot());
      } else {
	 slots.push(this.__assignmentExpression());
	 if (this.peek().type != "]") {
	    this.consume(",");
	 }
      }
   }

   this.consume("]");
   return ast.ArrayLiteral(slots);
}

Parser.prototype.__objectLiteral = function() {
   let pos = this.consume("{").pos;
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
	    unexpectedToken(peeked);
	 }
      } else if (expectComa) {
	 unexpectedToken(peeked, ",");
      } else {
	 props.push(this.__propertyAssignment());
	 expectComa = true;
      }
   }

   this.consume("}");
   return ast.ObjectLiteral(props);
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
      return ast.PropertyAssignmentGet(name, body);

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
      return ast.PropertyAssignmentSet(name, arg, body);

   } else {
      let name = this.__propertyName();

      this.consume(":");
      return ast.PropertyAssignment(name, this.__assignmentExpression());
   }
}

Parser.prototype.__propertyName = function() {
   let peeked = this.peek();

   if (peeked.type == "RESERVED"
       || peeked.type == "IDENTIFIER"
       || peeked.type == "LITERAL") {
      this.consume();
      return ast.Literal(peeked.value);
   }
   unexpectedToken("at " + peeked.pos + " wrong property name `" +
		   peeked.value + "`");
}

Parser.prototype.__newExpression = function() {
   if (this.peekIsReserved("new")) {
      let pos = this.consume().pos;
      let classOrExpr = this.__newExpression();
      let args = null;

      if (this.peek().type == "(") {
	 args = this.__arguments();
      }
      return ast.New(classOrExpr, args);
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
      return this.__accessOrCall(ast.AccessBracket(expr, field), callAllowed);
   } else if (peeked.type == ".") {
      this.consume();
      let field = this.__identifier();
      return this.__accessOrCall(ast.AccessDot(expr, field), callAllowed);
   } else if (peeked.type == "(" && callAllowed) {
      let args = this.__arguments();
      return this.__accessOrCall(ast.Call(expr, args), callAllowed);
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
      return ast.Postfix(lhs, peeked.type);
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
      return ast.Unary(peeked.value, this.__unaryExpression());
   } else if (peeked.type == "++" || peeked.type == "--") {
      this.consume();
      return ast.Prefix(peeked.type, this.__unaryExpression());
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
	       expr = ast.Binary(expr, op, binary.call(this, level + 1));
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
      return ast.Conditional(expr, then_, else_);
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
      let op = this.consume();
      let rhs = this.__assignmentExpression(withInKwd);
      return ast.Assign(lhs, op.value, rhs);
   } else {
      return lhs;
   }
}

Parser.prototype.__expression = function(withInKwd=true) {
   let pos = this.peek().pos;
   let exprs = [this.__assignmentExpression(withInKwd)];

   for(;;) {
      if (!this.peekHasType(",")) {
	 break;
      }

      this.consume();
      exprs.push(this.__assignmentExpression(withInKwd));
   }
   return exprs.length == 1 ? exprs[0] : ast.Sequence(exprs);
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

   this.consume("{");
   while (!this.peekHasType("}")) {
      stmts.push(this.__statement());
   }
   this.consume();
   return ast.Block(stmts);
}

Parser.prototype.__variableStatement = function(vtype) {
   let varStmt;

   this.consumeReserved(vtype);
   varStmt = ast.VariableStmt(vtype, this.__variableDeclarationList());
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
   let id = this.__identifier();
   let init = null;

   if (this.peekHasType("=")) {
      this.consume();
      init = this.__assignmentExpression(withInKwd);
   }
   return ast.VariableDeclaration(id, init);
}

Parser.prototype.__emptyStatement = function() {
   return ast.EmptyStatement();
}

Parser.prototype.__expressionStatement = function() {
   let peeked = this.peek();
   let expression;

   if (peeked.type == "{"
       || peeked.type == "function"
       || peeked.type == "service") {
      unexpectedToken(peeked, "expression");
   }
   expression = this.__expression(false);
   this.consumeOptionalEmpty();
   return ast.ExpressionStatement(expression);
}

Parser.prototype.__ifStatement = function() {
   let test;
   let then_;
   let else_ = null;

   this.consumeReserved("if");
   this.consume("(");
   test = this.__expression();
   this.consume(")");
   then_ = this.__statement();
   if (this.peekHasValue("else")) {
      this.consume();
      else_ = this.__statement();
   }
   return ast.If(test, then_, else_);
}

Parser.prototype.__iterationStatement = function() {
   let test;
   let stmt;

   switch (this.peek().value) {
   case "do":
      this.consume();
      stmt = this.__statement();
      this.consumeReserved("while");
      this.consume("(");
      test = this.__expression();
      this.consume(")");
      this.consumeOptionalEmpty();
      return ast.Do(test, stmt);
   case "while":
      this.consume();
      this.consume("(");
      test = this.__expression();
      this.consume(")");
      return ast.While(test, this.__statement());
   case "for":
      let forInExpr = null;
      let vtype = null;
      let initVarDecl = null;
      let init = null;
      let test = null;
      let after = null;
      let stmt;

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

      return (forInExpr
	      ? ast.ForIn(vtype, initVarDecl, forInExpr, stmt)
	      : ast.For(vtype, initVarDecl, init, test, after, stmt));
   }
}

Parser.prototype.__continueStatement = function() {
   let identifier = null;
   let pos = this.consumeReserved("continue").pos;
   let peeked = this.peek();

   if (peeked.type == "IDENTIFIER" && !peeked.newLine) {
      identifier = this.__identifier();
   }
   this.consumeOptionalEmpty();

   return ast.Continue(identifier);
}

Parser.prototype.__breakStatement = function() {
   let identifier = null;
   let pos = this.consumeReserved("break").pos;
   let peeked = this.peek();

   if (peeked.type == "IDENTIFIER" && !peeked.newLine) {
      identifier = this.__identifier();
   }
   this.consumeOptionalEmpty();

   return ast.Break(identifier);
}

Parser.prototype.__returnStatement = function() {
   let expr = null;
   let pos = this.consumeReserved("return").pos;
   let peeked = this.peek();

   if (peeked.type != ";" && !peeked.newLine) {
      expr = this.__expression();
   }
   this.consumeOptionalEmpty();

   return ast.Return(expr);
}

//
// TODO: Should trigger an error in strict mode
// http://www.ecma-international.org/ecma-262/5.1/#sec-12.10
//
Parser.prototype.__withStatement = function() {
   let expr = null;
   let stmt = null;
   let pos = this.consumeReserved("with").pos;

   this.consume("(");
   expr = this.__expression();
   this.consume(")");
   stmt = this.__statement();
   return ast.With(expr, stmt);
}

Parser.prototype.__switchStatement = function() {
   let expr = null;
   let caseBlock = null;
   let pos = this.consumeReserved("switch").pos;

   this.consume("(");
   expr = this.__expression();
   this.consume(")");
   caseBlock = this.__caseBlock();
   return ast.Switch(expr, caseBlock);
}

Parser.prototype.__caseBlock = function() {
   let defaultUsed = false;
   let clauses = [];
   let pos = this.consume("{").pos;

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
	 unexpectedToken(peeked);
      }
   }

   this.consume("}");
   return ast.CaseBlock(clauses);
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
   return ast.CaseClause(expr, stmts);
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
   return ast.DefaultClause(stmts);
}

Parser.prototype.__labelledStatement = function() {
   let identifier = this.__identifier();

   this.consume(";");
   return ast.LabelledStmt(identifier, this.__statement());
}

Parser.prototype.__throwStatement = function() {
   let expr;

   this.consumeReserved("throw");
   expr = this.__expression();
   this.consumeOptionalEmpty();
   return ast.Throw(expr);
}

Parser.prototype.__tryStatement = function() {
   this.consumeReserved("try");
   return ast.Try(this.__block(), this.__catch(), this.__finally());
}

Parser.prototype.__catch = function() {
   let identifier;

   this.consumeReserved("catch");
   this.consume("(");
   identifier = this.__identifier();
   this.consume(")");
   return ast.Catch(identifier, this.__block());
}

Parser.prototype.__finally = function() {
   this.consumeReserved("finally");
   return ast.Finally(this.__block());
}

Parser.prototype.__debugger = function() {
   this.consumeReserved("debugger");
   this.consumeOptionalEmpty();
   return ast.Debugger();
}

//
// Functions and Programs
// http://www.ecma-international.org/ecma-262/5.1/#sec-A.5
//

Parser.prototype.__functionDeclaration = function(expr=false) {
   let id = null;
   let params;
   let body;

   this.consumeReserved();
   if (!expr || (expr && this.peekIsIdentifier())) {
      id = this.__identifier();
   }

   this.consume("(");
   params = this.__formalParameterList();
   this.consume(")");

   this.consume("{");
   body = this.__functionBody();
   this.consume("}");
   return (expr
	   ? ast.FunctionExpression(id, params, body)
	   : ast.FunctionDeclaration(id, params, body));
}

Parser.prototype.__functionExpression = function() {
   return this.__functionDeclaration(true);
}

Parser.prototype.__serviceDeclaration = function(expr=false) {
   let id = null;
   let params;
   let body = null;

   this.consumeReserved();
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

   return (expr
	   ? ast.ServiceExpression(id, params, body)
	   : ast.ServiceDeclaration(id, params, body));
}

Parser.prototype.__serviceExpression = function() {
   return this.__serviceDeclaration(true);
}

Parser.prototype.__formalParameterList = function() {
   let params = [];
   let iter = false;

   while (!this.peekHasType(")")) {
      let id = this.__identifier();
      let initExpr = null;

      if (this.peekHasType("=")) {
	 this.consume();
	 initExpr = this.__assignmentExpression();
      }
      params.push(ast.Parameter(id, initExpr));
      if (!this.peekHasType(")")) {
	 this.consume(",");
      }
   }
   return params;
}

Parser.prototype.__functionBody = function() {
   return this.__sourceElements(true);
}

Parser.prototype.__program = function() {
   return this.__sourceElements();
}

Parser.prototype.__sourceElements = function(fn=false) {
   let els = [];

   for (;;) {
      let tokenType = this.peek().type;

      if ((!fn && tokenType == "EOF") || (fn && tokenType == "}")) {
	 break;
      }
      els.push(this.__sourceElement());
   }
   return ast.Program(els);
}

Parser.prototype.__sourceElement = function() {
   let peeked = this.peek();

   switch (peeked.value) {
   case "EOF":
      unexpectedToken(peeked);
   case "function":
      return this.__functionDeclaration();
   case "service":
      return this.__serviceDeclaration();
   default:
      return this.__statement();
   }
}

//
// Hiphop.js variabe scoping example
// ---------------------------------
//
// \loopeach I {
//    let foo = val(I);
//    console.log(foo);
//    \pause;
//    foo = \val(G);
//    \emit O;
//    console.log(foo);
// }
//
// SUSPEND IMMEDIATE FROM(expr) TO(expr) EMITWHENSUSPENDED S {
// }
//
// SUSPEND(expr) {
// }
//
// SUSPEND IMMEDIATE(expr) {
// }
//
// SUSPEND(expr) EMITWHENSUSPENDED S {
// }
//
// (function() {
//    let foo;
//    return <hh.loopeach I>
//      <hh.atom apply=${function() { foo = this.value.I }}/>
//      <hh.atom apply=${function() { console.log(foo) }}/>
//      <hh.pause/>
//      <hh.atom apply=${function() { foo = this.value.G }}/>
//      <hh.emit O/>
//      <hh.atom apply=${function() { console.log(foo) }}/>
//    </hh.loopeach>
// })()
//
//
// COUNT EXPRESSIONS:
//
// AWAIT COUNT(expr, expr)
//
