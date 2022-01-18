/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/preprocessor/parser.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 17:53:13 2018                          */
/*    Last change :  Tue Jan 18 07:22:05 2022 (serrano)                */
/*    Copyright   :  2018-22 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop parser based on the genuine Hop parser                    */
/*=====================================================================*/
"use hopscript"

const hopc = require(hop.hopc);
const ast = require(hopc.ast);
const astutils = require("./astutils.js");
const parser = new hopc.Parser();
const hhaccess = require("./_hhaccess.hop");
import * as error from "../lib/error.js";

const hhname = "__hh_module";
let hhmodulePath;

let hhkey = 0;

/*---------------------------------------------------------------------*/
/*    consumeID ...                                                    */
/*---------------------------------------------------------------------*/
function consumeID(val) {
   const tok = this.consumeToken(this.ID);
   if (tok.value !== val) {
      throw tokenTypeError(tok);
   } else {
      return tok;
   }
}

/*---------------------------------------------------------------------*/
/*    setHHModulePath ...                                              */
/*---------------------------------------------------------------------*/
function setHHModulePath(path) {
   hhmodulePath = path;
}   
   
/*---------------------------------------------------------------------*/
/*    self ...                                                         */
/*---------------------------------------------------------------------*/
function self(loc) {
   return astutils.J2SDecl(loc, "this", "let-opt", "this");
}

/*---------------------------------------------------------------------*/
/*    location ...                                                     */
/*---------------------------------------------------------------------*/
function location(loc) {
   return astutils.J2SObjInit(
      loc,
      [astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "filename"),
	 astutils.J2SString(loc, loc.cdr.car)),
	astutils.J2SDataPropertyInit(
	   loc,
	   astutils.J2SString(loc, "pos"),
	   astutils.J2SNumber(loc, loc.cdr.cdr.car))]);
}

/*---------------------------------------------------------------------*/
/*    locInit ...                                                      */
/*---------------------------------------------------------------------*/
function locInit(loc) {
   return astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString(loc, "%location"),
      location(loc));
}

/*---------------------------------------------------------------------*/
/*    tagInit ...                                                      */
/*---------------------------------------------------------------------*/
function tagInit(tag, loc) {
   return astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString(loc, "%tag"),
      astutils.J2SString(loc, tag));
}
   
/*---------------------------------------------------------------------*/
/*    tokenLocation ...                                                */
/*---------------------------------------------------------------------*/
function tokenLocation(token) {
   return { filename: token.filename, pos: token.pos };
}

/*---------------------------------------------------------------------*/
/*    tokenValueError ...                                              */
/*---------------------------------------------------------------------*/
function tokenValueError(token) {
   return error.SyntaxError("unexpected token `" + token.value + "'",
			     tokenLocation(token));
}


/*---------------------------------------------------------------------*/
/*    tokenTypeError ...                                               */
/*---------------------------------------------------------------------*/
function tokenTypeError(token) {
   return error.SyntaxError("unexpected token `" + token.type + "'",
			     tokenLocation(token));
}

/*---------------------------------------------------------------------*/
/*    tokenReferenceError ...                                          */
/*---------------------------------------------------------------------*/
function tokenReferenceError(token) {
   error.ReferenceError("unbound interface `" + token.value + "'",
			 tokenLocation(token));
}

/*---------------------------------------------------------------------*/
/*    isIdToken ...                                                    */
/*---------------------------------------------------------------------*/
function isIdToken(parser, token, id) {
   return token.type === parser.ID && token.value === id;
}

/*---------------------------------------------------------------------*/
/*    hhref ...                                                        */
/*---------------------------------------------------------------------*/
function hhref(loc, name) {
   const hh = astutils.J2SUnresolvedRef(loc, "$$hiphop");
   return astutils.J2SAccess(loc, hh, astutils.J2SString(loc, name));
}

/*---------------------------------------------------------------------*/
/*    hhwrapDecl ...                                                   */
/*    -------------------------------------------------------------    */
/*    Generate:                                                        */
/*      STMT -> hop.hihop = require("hiphop"); STMT                    */
/*---------------------------------------------------------------------*/
function hhwrapDecl(token, stmt) {
   return stmt;
}

/*---------------------------------------------------------------------*/
/*    hhwrapExpr ...                                                   */
/*    -------------------------------------------------------------    */
/*    Generate:                                                        */
/*      EXPR -> ((__hh_module => EXPR)require("hiphop"))               */
/*---------------------------------------------------------------------*/
function hhwrapExpr(token, expr) {
   return expr;
}
   
/*---------------------------------------------------------------------*/
/*    parseHHThisExpr ...                                              */
/*    -------------------------------------------------------------    */
/*    hhexpr ::= ${ jsexpr }                                           */
/*       | jsexpr                                                      */
/*       | now.ident                                                   */
/*       | pre.ident                                                   */
/*       | nowval.ident                                                */
/*       | preval.ident                                                */
/*---------------------------------------------------------------------*/
function parseHHThisExpr(parser, iscnt = false) {
   let accessors = [];
   const { expr: e, accessors: axs } = parser.call(this, accessors);
   const expr = hhaccess(e, iscnt, hhname, accessors);
   return { expr: expr, accessors: accessors };
}

/*---------------------------------------------------------------------*/
/*    parseHHThisBlock ...                                             */
/*    -------------------------------------------------------------    */
/*    Parse JS block with augmented expressions as in parseHHThisExpr  */
/*---------------------------------------------------------------------*/
function parseHHThisBlock() {
   let accessors = [];
   const block = hhaccess(this.parseBlock(), false, hhname, accessors);
   return { block: block, accessors: accessors };
}

/*---------------------------------------------------------------------*/
/*    parseHHExpression ...                                            */
/*---------------------------------------------------------------------*/
function parseHHExpression() {
   return parseHHThisExpr.call(this, accessors => {
      if (this.peekToken().type === this.DOLLAR) {
	 const expr = this.parseDollarExpression();
	 return { expr: expr, accessors: accessors };
      } else {
	 const expr = this.parseCondExpression();
	 return { expr: expr, accessors: accessors };
      }
   });
}

/*---------------------------------------------------------------------*/
/*    parseHHCondExpression ...                                        */
/*---------------------------------------------------------------------*/
function parseHHCondExpression(iscnt, isrun) {
   return parseHHThisExpr.call(
      this,
      accessors => {
	 if (this.peekToken().type === this.DOLLAR) {
	    const expr = this.parseDollarExpression();
	    return { expr: expr, accessors: accessors };
	 } else {
	    const expr = this.parseCondExpression();
	    return { expr: expr, accessors: accessors };
	 }
      },
      iscnt);
}

/*---------------------------------------------------------------------*/
/*    parseValueApply ...                                              */
/*---------------------------------------------------------------------*/
function parseValueApply(loc) {
   const { expr: expr, accessors } = parseHHExpression.call(this);
   let init;
   if (typeof expr === "J2SDollar") {
      init = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "value"),
	 expr.node);
   } else {
      const fun = astutils.J2SMethod(
	 loc, "iffun", [],
	 astutils.J2SBlock(loc, loc, [astutils.J2SReturn(loc, expr)]),
	 self(loc));
      init = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "apply"),
	 fun);
   }
   return { init: init, accessors: accessors }
}
   
/*---------------------------------------------------------------------*/
/*    parseDelay ...                                                   */
/*    -------------------------------------------------------------    */
/*    delay ::= (hhexpr)                                               */
/*       | count(hhexpr, hhexpr)                                       */
/*       | immediate(hhexpr)                                           */
/*---------------------------------------------------------------------*/
function parseDelay(loc, tag, action = "apply", id = false) {
   if (isIdToken(this, this.peekToken(), "count")) {
      // COUNT(hhexpr, hhexpr)
      const loccnt = this.consumeAny();
      this.consumeToken(this.LPAREN);
      const { expr: count, accessors: cntaccessors } =
	    parseHHCondExpression.call(this, true, false);
      this.consumeToken(this.COMMA);
      const { expr, accessors } =
	    parseHHCondExpression.call(this, false, false);

      this.consumeToken(this.RPAREN);

      const fun = astutils.J2SMethod(
	 loc, "delayfun", [], 
	 astutils.J2SBlock(loc, loc, [astutils.J2SReturn(loc, expr)]),
         self(loc));
      const cntfun = astutils.J2SMethod(
	 loc, "cntfun", [], 
	 astutils.J2SBlock(loc, loc, [astutils.J2SReturn(loc, count)]),
         self(loc));
      
      const inits = [
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString(loc, "immediate"),
	    astutils.J2SBool(loc, false)), 
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString(loc, action),
	    fun),
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString(loc, "count" + action),
	    cntfun)];
      
      return { inits: inits, accessors: cntaccessors.concat(accessors) };
   } else {
      let immediate = false;
      
      if (isIdToken(this, this.peekToken(), "immediate")) {
	 // immediate(hhexpr)
	 const imm = this.consumeAny();
	 immediate = true;
      }

      // hhexpr
      this.consumeToken(this.LPAREN);
      const { expr, accessors } = parseHHExpression.call(this);
      this.consumeToken(this.RPAREN);
      
      let inits;

      if (typeof expr === "J2SUnresolvedRef") {
	 inits = [
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString(loc, "immediate"),
	       astutils.J2SBool(loc, immediate)), 
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString(loc, expr.id),
	       astutils.J2SString(loc, expr.id))];
      } else {
	 const fun = astutils.J2SMethod(
	    loc, "hhexprfun", [], 
	    astutils.J2SBlock(loc, loc, [astutils.J2SReturn(loc, expr)]),
            self(loc));
	 
	 inits = [
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString(loc, "immediate"),
	       astutils.J2SBool(loc, immediate)), 
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString(loc, action),
	       fun)];
      }
      return { inits: inits, accessors: accessors };
   }
}

/*---------------------------------------------------------------------*/
/*    parseHHBlock ...                                                 */
/*    -------------------------------------------------------------    */
/*    block ::= { stmt; ... }                                          */
/*---------------------------------------------------------------------*/
function parseHHBlock(consume = true) {
   let nodes = [];

   if (consume) this.consumeToken(this.LBRACE);

   while (true) {
      switch (this.peekToken().type) {
	 case this.SEMICOLON:
	    this.consumeAny();
	    break;
	    
	 case this.RBRACE: {
	    const nothing = this.consumeAny();
	    if (nodes.length === 0) {
	       return [parseEmpty(nothing, "NOTHING", "nothing")];
	    } else {
	       return nodes;
	    }
	 }

	 case this.let:
	    nodes.push(parseLet.call(this, this.consumeAny(), "let"));
	    return nodes;

	 case this.const:
	    nodes.push(parseLet.call(this, this.consumeAny(), "const"));
	    return nodes;

	 case this.ID:
	    if (this.peekToken().value === "signal") {
	       nodes.push(parseSignal.call(this, this.consumeAny()));
	       return nodes;
	    } else {
	       nodes.push(parseStmt.call(this, this.peekToken(), false));
	       break;
	    }
	       
	 default:
	    nodes.push(parseStmt.call(this, this.peekToken(), false));
	    break;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    parseMachineModule ...                                           */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | MODULE [ident] (sig-or-vdecl, ...)                          */
/*           [implements dollarexpr, ...] block                        */
/*       | MACHINE [ident] (sig-or-vdecl, ...)                         */
/*           [implements dollarexpr, ...] block                        */
/*    intf ::= [mirror] ident | [mirror] $dollar                       */
/*    sig-or-vdecl ::= signal | vdecl                                  */
/*    signal ::= [direction] ident [combine]                           */
/*    vdecl ::= var ident                                              */
/*    direction ::= in | out | inout                                   */
/*    combine ::= combine expr                                         */
/*---------------------------------------------------------------------*/
function parseMachineModule(token, declaration, ctor) {
   const loc = token.location;
   const tag = tagInit(ctor.toLowerCase(), loc);
   let id;
   let attrs;
   let esigs = [];

   if (this.peekToken().type === this.ID) {
      id = this.consumeAny();
      const locid = id.location;

      attrs = astutils.J2SObjInit(
         locid,
         [astutils.J2SDataPropertyInit(
              locid,
              astutils.J2SString(locid, "id"),
              astutils.J2SString(locid, id.value)),
           locInit(loc), tag]);
   } else if (declaration) {
      throw tokenTypeError(this.consumeAny());
   } else {
      attrs = astutils.J2SObjInit(loc, [locInit(loc), tag]);
   }

   const { vars, vals } = parseModuleVarlist.call(this);
   
   if (this.peekToken().type === this.ID 
       && this.peekToken().value === "implements") {
      this.consumeAny();
      esigs = parseInterfaceIntflist.call(this);
   }
   
   this.consumeToken(this.LBRACE);
   const sigs = parseModuleSiglist.call(this).concat(esigs);
   
   const stmts = parseHHBlock.call(this, false);
   let mod;
   
   if (vars.length !== 0) {
      const decls = 
         vars.map(tok => astutils.J2SDeclInit(tok.location, tok.value, astutils.J2SUndefined(loc), "let"));
      const framep = astutils.J2SDeclParam(loc, "__frame", "array");
      const assigframe = astutils.J2SSeq(
         loc,
         decls.map((d, i, arr) => astutils.J2SStmtExpr(
		     loc,
		     astutils.J2SAssig(loc,
			astutils.J2SUnresolvedRef(loc, d.id),
			astutils.J2SCond(loc,
			   astutils.J2SBinary(loc, "<",
			      astutils.J2SNumber(loc, i),
			      astutils.J2SAccess(loc,
				 astutils.J2SRef(loc, framep),
				 astutils.J2SString(loc, "length"))),
			   astutils.J2SAccess(loc,
			      astutils.J2SRef(loc, framep),
			      astutils.J2SNumber(loc, i)),
                           vals[i])))));
      const ablock = astutils.J2SBlock(loc, loc, [assigframe]);
      const appl = astutils.J2SDataPropertyInit(loc, 
         astutils.J2SString(loc, "apply"),
         astutils.J2SMethod(loc, "framefun", [framep], ablock, self(loc)));
      const aattrs = astutils.J2SObjInit(
         loc, [locInit(loc), tagInit("frame", loc), appl]);
      const sattrs = astutils.J2SObjInit(
         loc, [locInit(loc), tagInit("frame", loc)]);
      const atom = astutils.J2SCall(loc, 
         hhref(loc, "ATOM"), null, [aattrs]);
      
      const val = astutils.J2SCall(loc, hhref(loc, "SEQUENCE"), 
         null,
         [sattrs, atom].concat(stmts));
      
      const ret = astutils.J2SReturn(loc, val);
      
      const cblock = astutils.J2SBlock(loc, loc, 
         [astutils.J2SVarDecls(loc, decls), ret]);
      const clone = astutils.J2SFun(loc, "modfun", [], cblock);
      
      const fattrs = astutils.J2SObjInit(
         loc,
         [astutils.J2SDataPropertyInit(
              loc,
              astutils.J2SString(loc, "fun"),
              clone),
           locInit(loc), tag]);
      const cfun = astutils.J2SCall(loc, hhref(loc, "FRAME"), 
         null, [fattrs]);

      mod = astutils.J2SCall(loc, hhref(loc, ctor), 
         null,
         [attrs].concat(sigs, [cfun]));
   } else {
      mod = astutils.J2SCall(loc, hhref(loc, ctor), 
         null,
         [attrs].concat(sigs, stmts));
   }
   
   if (declaration) {
      return astutils.J2SVarDecls(
         loc, [astutils.J2SDeclInit(loc, id.value, mod)]);
   } else {
      return mod;
   }
}

/*---------------------------------------------------------------------*/
/*    parseInterface ...                                               */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | interface [ident] [extends dollarexpr, ...] { signal, ... } */
/*---------------------------------------------------------------------*/
function parseInterface(token, declaration) {
   const loc = token.location;
   const tag = tagInit("interface", loc);
   let id;
   let attrs;
   let esigs = [];

   if (this.peekToken().type === this.ID) {
      id = this.consumeAny();
      const locid = id.location;
      attrs = astutils.J2SObjInit(
	 locid,
	 [astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString(locid, "id"),
	    astutils.J2SString(locid, id.value)),
	   locInit(loc), tag]);
   } else if (declaration) {
      throw tokenTypeError(this.consumeAny());
   } else {
      attrs = astutils.J2SObjInit(loc, [locInit(loc), tag]);
   }

   if (this.peekToken().type === this.extends) {
      this.consumeAny();

      esigs = parseInterfaceIntflist.call(this);
   }

   this.consumeToken(this.LBRACE);
   let sigs = parseModuleSiglist.call(this);
   this.consumeToken(this.RBRACE);

   const intf = astutils.J2SCall(loc, hhref(loc, "INTERFACE"), 
				 null,
				 [attrs].concat(sigs.concat(esigs)));
   
   if (declaration) {
      return astutils.J2SVarDecls(
	 loc, [astutils.J2SDeclInit(loc, id.value, intf)]);
   } else {
      return intf;
   }
}

/*---------------------------------------------------------------------*/
/*    parseInterfaceOld ...                                            */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | interface [ident] (signal, ...) [extends dollarexpr, ...]   */
/*---------------------------------------------------------------------*/
function parseInterfaceOld(token, declaration) {
   const loc = token.location;
   const tag = tagInit("interface", loc);
   let id;
   let attrs;

   if (this.peekToken().type === this.ID) {
      id = this.consumeAny();
      const locid = id.location;
      attrs = astutils.J2SObjInit(
	 locid,
	 [astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString(locid, "id"),
	    astutils.J2SString(locid, id.value)),
	   locInit(loc), tag]);
   } else if (declaration) {
      throw tokenTypeError(this.consumeAny());
   } else {
      attrs = astutils.J2SObjInit(loc, [locInit(loc), tag]);
   }

   let { sigs, vars } = parseModuleSiglistOld.call(this);

   if (this.peekToken().type === this.extends) {
      this.consumeAny();

      sigs = sigs.concat(parseInterfaceIntflist.call(this));
   }

   const intf = astutils.J2SCall(loc, hhref(loc, "INTERFACE"), 
				 null,
				 [attrs].concat(sigs));
   
   if (declaration) {
      return astutils.J2SVarDecls(
	 loc, [astutils.J2SDeclInit(loc, id.value, intf)]);
   } else {
      return intf;
   }
}

/*---------------------------------------------------------------------*/
/*    parseInterfaceIntflist ...                                       */
/*---------------------------------------------------------------------*/
function parseInterfaceIntflist() {
   let args = [];

   do {
      let mirror = false;
      
      if (this.peekToken().type === this.ID 
	  && this.peekToken().value === "mirror") {
	 mirror = true;
	 this.consumeAny();
      } 
      
      const token = this.peekToken();
      const loc = token.location;
      const tag = tagInit("interface", loc);
      let expr;
      
      switch (token.type) {
	 case this.DOLLAR:
	    expr = this.parseDollarExpression().node;
	    break;
	    
	 case this.ID:
	    this.consumeAny();
	    expr = astutils.J2SCall(loc, hhref(loc, "getInterface"),
	       null, 
	       [astutils.J2SString(loc, token.value),
		 location(loc)]);
	    break;
	    
	 default: 
	    throw error.SyntaxError("interface: bad interface", tokenLocation(token));
      }
      
      const attrs = astutils.J2SObjInit(
	 loc,
	 [astutils.J2SDataPropertyInit(
	      loc,
	      astutils.J2SString(loc, "value"),
	      expr),
	   astutils.J2SDataPropertyInit(
	      loc,
	      astutils.J2SString(loc, "mirror"),
	      astutils.J2SBool(loc, mirror)),
	   locInit(loc), tag]);
      const intf = 
	 astutils.J2SCall(loc, hhref(loc, "INTF"), null, [attrs]);
      args.push(intf);
   } while (this.peekToken().type === this.COMMA ? (this.consumeAny(), true) : false)
   
   return args;
}
   
/*---------------------------------------------------------------------*/
/*    parseModuleVarlist ...                                           */
/*---------------------------------------------------------------------*/
function parseModuleVarlist() {
   let vars = [];
   let vals = [];
   
   this.consumeToken(this.LPAREN);
   
   while (this.peekToken().type !== this.RPAREN) {
      const tok = this.consumeToken(this.ID);
      vars.push(tok);
      
      if (this.peekToken().type === this.EGAL) {
	 this.consumeAny();
      	 vals.push(this.parseAssigExpression());
      } else {
      	 vals.push(astutils.J2SUndefined(tok.location));
      }

      if (this.peekToken().type === this.COMMA) {
	 this.consumeAny();
      }
   }

   this.consumeToken(this.RPAREN);

   return { vars, vals };
}

/*---------------------------------------------------------------------*/
/*    parseModuleSiglist ...                                           */
/*---------------------------------------------------------------------*/
function parseModuleSiglist() {

   function parseSignalModule(token) {
      const loc = token.location;
      let name, direction;

      if (token.type === this.in) {
	 let t = this.consumeToken(this.ID);
	 direction = "IN"
	 name = t.value;
      } else if (token.type === this.ID) {
	 switch (token.value) {
	    case "out": {
	       let t = this.consumeToken(this.ID);
	       direction = "OUT"
	       name = t.value;
	       break;
	    }
	    case "inout": {
	       let t = this.consumeToken(this.ID);
	       direction = "INOUT"
	       name = t.value;
	       break;
	    }
	    default: {
	       direction = "INOUT"
	       name = token.value;
	    }

	 }
      } else {
	 throw tokenTypeError(token)
      }
      
      const dir = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "direction"),
	 astutils.J2SString(loc, direction));
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "name"),
	 astutils.J2SString(loc, name));

      const inits = [locInit(loc), dir, id];
      let accessors = [];
      
      if (this.peekToken().type === this.EGAL) {
	 this.consumeAny();
	 const { expr, accessors: axs } = parseHHExpression.call(this);

	 const func = astutils.J2SMethod(
	    loc, "initfunc", [],
	    astutils.J2SBlock(
	       loc, loc,
	       [astutils.J2SReturn(loc, expr)]),
            self(loc));
	 const initfunc = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString(loc, "init_func"),
	    func);

	 accessors = axs;
	 inits.push(initfunc);
      }
	 
      if (isIdToken(this, this.peekToken(), "combine")) {
	 const locc = this.consumeAny().location;
	 const fun = this.parseCondExpression();

	 const combine = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString(loc, "combine_func"),
	    fun);
	 inits.push(combine);
      }

      const attrs = astutils.J2SObjInit(loc, inits);
      return astutils.J2SCall(loc, hhref(loc, "SIGNAL"), null,
			       [attrs].concat(accessors));
   }

   let sigs = [];

   while (true) {
      const ty = this.peekToken().type;
      
      if (ty === this.in) {
	 sigs.push(parseSignalModule.call(this, this.consumeAny()));
	 this.consumeToken(this.SEMICOLON);
      } else if (ty === this.ID) {
	 const val = this.peekToken().value;
 	 
	 if (val === "out" || val === "inout") {
	    sigs.push(parseSignalModule.call(this, this.consumeAny()));
	    this.consumeToken(this.SEMICOLON);
	 } else {
	    break;
	 }
      } else {
	 break;
      }
   }
   
   return sigs;
}

/*---------------------------------------------------------------------*/
/*    parseModuleSiglistOld ...                                        */
/*---------------------------------------------------------------------*/
function parseModuleSiglistOld() {

   function parseSignalModule(token) {
      const loc = token.location;
      let name, direction;

      if (token.type === this.in) {
	 let t = this.consumeToken(this.ID);
	 direction = "IN"
	 name = t.value;
      } else if (token.type === this.ID) {
	 switch (token.value) {
	    case "out": {
	       let t = this.consumeToken(this.ID);
	       direction = "OUT"
	       name = t.value;
	       break;
	    }
	    case "inout": {
	       let t = this.consumeToken(this.ID);
	       direction = "INOUT"
	       name = t.value;
	       break;
	    }
	    default: {
	       direction = "INOUT"
	       name = token.value;
	    }

	 }
      } else {
	 throw tokenTypeError(token)
      }
      
      const dir = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "direction"),
	 astutils.J2SString(loc, direction));
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "name"),
	 astutils.J2SString(loc, name));

      const inits = [locInit(loc), dir, id];
      let accessors = [];
      
      if (this.peekToken().type === this.EGAL) {
	 this.consumeAny();
	 const { expr, accessors: axs } = parseHHExpression.call(this);

	 const func = astutils.J2SMethod(
	    loc, "initfunc", [],
	    astutils.J2SBlock(
	       loc, loc,
	       [astutils.J2SReturn(loc, expr)]),
            self(loc));
	 const initfunc = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString(loc, "init_func"),
	    func);

	 accessors = axs;
	 inits.push(initfunc);
      }
	 
      if (isIdToken(this, this.peekToken(), "combine")) {
	 const locc = this.consumeAny().location;
	 const fun = this.parseCondExpression();

	 const combine = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString(loc, "combine_func"),
	    fun);
	 inits.push(combine);
      }

      const attrs = astutils.J2SObjInit(loc, inits);
      return astutils.J2SCall(loc, hhref(loc, "SIGNAL"), null,
			       [attrs].concat(accessors));
   }

   let lbrace = this.consumeToken(this.LPAREN);
   let sigs = [];
   let vars = [];

   while (true) {
      switch (this.peekToken().type) {
	 case this.RPAREN:
	    this.consumeAny();
	    return { sigs, vars };
	    
	 case this.var:
	    this.consumeAny();
	    vars.push(this.consumeToken(this.ID));
	    if (this.peekToken().type === this.RPAREN) {
	       this.consumeAny();
	       return { sigs, vars };
	    } else {
	       this.consumeToken(this.COMMA);
	       break;
	    }
	    
	 default:
	    sigs.push(parseSignalModule.call(this, this.consumeAny()));
	 
	    if (this.peekToken().type === this.RPAREN) {
	       this.consumeAny();
	       return { sigs, vars };
	    } else {
	       this.consumeToken(this.COMMA);
	    }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    parseHop ...                                                     */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | hop statement                                               */
/*---------------------------------------------------------------------*/
function parseAtom(token) {
   
   function parseAtomBlock(loc) {
      return parseHHThisBlock.call(this);
   }

   const loc = token.location;
   const { block, accessors } = parseAtomBlock.call(this, loc);
   const appl = astutils.J2SDataPropertyInit(
      loc, 
      astutils.J2SString(loc, "apply"),
      astutils.J2SMethod(loc, "atomfun", [], block, self(loc)));
   const tag = tagInit("hop", loc);
   const attrs = astutils.J2SObjInit(loc, [locInit(loc), tag, appl]);
   return astutils.J2SCall(loc, hhref(loc, "ATOM"), null,
			    [attrs].concat(accessors));
}

/*---------------------------------------------------------------------*/
/*    parseEmpty ...                                                   */
/*---------------------------------------------------------------------*/
function parseEmpty(token, fun, tag) {
   const loc = token.location;
   const attrs = astutils.J2SObjInit(loc, [locInit(loc), tagInit(tag, loc)]);
   
   return astutils.J2SCall(loc, hhref(loc, fun), null, [attrs]);
}

/*---------------------------------------------------------------------*/
/*    parseNothing ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | NOTHING                                                     */
/*---------------------------------------------------------------------*/
function parseNothing(token) {
   return parseEmpty(token, "NOTHING", "nothing");
}

/*---------------------------------------------------------------------*/
/*    parsePause ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | yield                                                       */
/*---------------------------------------------------------------------*/
function parsePause(token) {
   return parseEmpty(token, "PAUSE", "yield");
}

/*---------------------------------------------------------------------*/
/*    parseExit ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | break lbl                                                   */
/*---------------------------------------------------------------------*/
function parseExit(token) {
   const id = this.consumeToken(this.ID);
   const loc = id.location;
   const attrs = astutils.J2SObjInit(
      loc,
      [astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, id.value),
	 astutils.J2SString(loc, id.value)),
	locInit(loc), tagInit("break", loc)]);
   
   return astutils.J2SCall(loc, hhref(loc, "EXIT"), null, [attrs]);
}

/*---------------------------------------------------------------------*/
/*    parseHalt ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | exit                                                        */
/*---------------------------------------------------------------------*/
function parseHalt(token) {
   return parseEmpty(token, "HALT", "exit");
}

/*---------------------------------------------------------------------*/
/*    parseSequence ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SEQUENCE block                                              */
/*---------------------------------------------------------------------*/
function parseSequence(token, tagname, id, consume) {
   const loc = token.location;
   const locid = id.location;
   const tag = tagInit(tagname, loc);
   const body = parseHHBlock.call(this, consume);
   const attrs = id 
      ? astutils.J2SObjInit(loc,
	 [astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString(locid, "id"),
	    astutils.J2SString(locid, id.value)),
 	   locInit(loc), tag])
      : astutils.J2SObjInit(loc, [locInit(loc), tag]);

   return astutils.J2SCall(loc, hhref(loc, "SEQUENCE"), 
			    null,
			    [attrs].concat(body));
}

/*---------------------------------------------------------------------*/
/*    parseNamedSequence ...                                           */
/*---------------------------------------------------------------------*/
function parseNamedSequence(id, tagname, consume) {
   let next = this.consumeToken(this.LBRACE);
   return parseSequence.call(this, next, tagname, id, consume);
}

/*---------------------------------------------------------------------*/
/*    parseFork ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | fork ["name"] block [par block ...]                         */
/*---------------------------------------------------------------------*/
function parseFork(token) {
   const loc = token.location;
   const tag = tagInit("fork", loc);
   let id;
   let attrs;
   let body = [];

   if (this.peekToken().type === this.STRING) {
      id = this.consumeAny();
      const locid = id.location;

      attrs = astutils.J2SObjInit(
	 locid,
	 [astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString(locid, "id"),
	    astutils.J2SString(locid, id.value)),
	   locInit(loc), tag]);
   } else {
      attrs = astutils.J2SObjInit(loc, [locInit(loc), tag]);
   }

   if (this.peekToken().type === this.DOLLAR) {
      this.consumeToken(this.DOLLAR);
      const expr = this.parseExpression();
      this.consumeToken(this.RBRACE);
      return astutils.J2SCall(loc, hhref(loc, "FORK"), 
			       null,
			       [attrs].concat(expr));
   } else {
      body.push(astutils.J2SCall(loc, hhref(loc, "SEQUENCE"),
				   null,
				   [astutils.J2SObjInit(loc, [locInit(loc), tag])]
   .concat(parseHHBlock.call(this))));

      while (isIdToken(this, this.peekToken(), "par")) {
      	 body.push(parseSequence.call(this, this.consumeAny(), "par", false, true));
      }

      return astutils.J2SCall(loc, hhref(loc, "FORK"), 
			       null,
			       [attrs].concat(body));
   }
}

/*---------------------------------------------------------------------*/
/*    parseEmitSustain ...                                             */
/*    -------------------------------------------------------------    */
/*    emitsig ::= ident | ident(hhexpr)                                */
/*---------------------------------------------------------------------*/
function parseEmitSustain(token, command) {
   
   function parseSignalEmit(loc) {
      const id = this.consumeToken(this.ID);
      const locid = id.location;
      const tag = tagInit(command.toLowerCase(), loc);
      let inits = [locInit(locid), tag, astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString(locid, id.value),
	 astutils.J2SString(locid, id.value))];
      let accessors = [];

      const lparen = this.consumeToken(this.LPAREN);
	 
      if (this.peekToken().type !== this.RPAREN) {
	 const ll = lparen.location;
	 const { init: val, accessors: axs } = parseValueApply.call(this, ll);
	 const rparen = this.consumeToken(this.RPAREN);

	 inits.push(val);
	 accessors = axs;
      } else {
	 this.consumeAny();
      }
      
      return astutils.J2SCall(
	 loc, hhref(loc, command), null,
	 [astutils.J2SObjInit(locid, inits)].concat(accessors));
   }

   const loc = token.location;
   let locinit = locInit(loc);
   let nodes = [parseSignalEmit.call(this, loc)];

   while (this.peekToken().type === this.COMMA) {
      this.consumeAny();
      nodes.push(parseSignalEmit.call(this, loc));
   }

   if (nodes.length === 1) {
      return nodes[0];
   } else {
      return astutils.J2SCall(
	 loc, hhref(loc, "SEQUENCE"), null,
	 [astutils.J2SObjInit(loc, [locinit])].concat(nodes));
   }
}

/*---------------------------------------------------------------------*/
/*    parseEmit ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | EMIT emitsig, ...                                           */
/*---------------------------------------------------------------------*/
function parseEmit(token) {
   return parseEmitSustain.call(this, token, "EMIT");
}

/*---------------------------------------------------------------------*/
/*    parseSustain ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SUSTAIN emitsig, ...                                        */
/*---------------------------------------------------------------------*/
function parseSustain(token) {
   return parseEmitSustain.call(this, token, "SUSTAIN");
}

/*---------------------------------------------------------------------*/
/*    parseAwait ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | AWAIT delay                                                 */
/*---------------------------------------------------------------------*/
function parseAwait(token) {
   const loc = token.location;
   const tag = tagInit("await", loc);
   const { inits, accessors } = parseDelay.call(this, loc, "AWAIT", "apply");

   return astutils.J2SCall(
      loc, hhref(loc, "AWAIT"),
      null,
      [astutils.J2SObjInit(loc, [locInit(loc), tag].concat(inits))]
	 .concat(accessors));
}

/*---------------------------------------------------------------------*/
/*    parseIf ...                                                      */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | IF (hhexpr) block [else stmt]                               */
/*---------------------------------------------------------------------*/
function parseIf (token) {
   const loc = token.location;

   this.consumeToken(this.LPAREN);
   const { init, accessors } = parseValueApply.call(this, loc);
   const attrs = astutils.J2SObjInit(
      loc, [locInit(loc), tagInit("if", loc),init]);
   this.consumeToken(this.RPAREN);
   
   const then = parseStmt.call(this, this.peekToken(), false);

   const args = [attrs].concat(accessors);
   args.push(then);
   
   if (this.peekToken().type === this.ELSE) {
      const loce = this.consumeAny().location;
      args.push(parseStmt.call(this, this.peekToken(), false));
   }

   return astutils.J2SCall(loc, hhref(loc, "IF"), null, args);
}

/*---------------------------------------------------------------------*/
/*    parseAbortWeakabort ...                                          */
/*    stmt ::= ...                                                     */
/*       | ABORT delay block                                           */
/*       | WEAKABORT delay block                                       */
/*---------------------------------------------------------------------*/
function parseAbortWeakabort(token, command) {
   const loc = token.location;
   const tag = tagInit(command.toLowerCase(), loc);
   const { inits, accessors } = parseDelay.call(this, loc, tag, "apply");
   const stmts = parseHHBlock.call(this);
   
   return astutils.J2SCall(
      loc, hhref(loc, command), null,
      [astutils.J2SObjInit(loc, [locInit(loc), tag].concat(inits))]
	 .concat(accessors)
	 .concat(stmts));
}
   
/*---------------------------------------------------------------------*/
/*    parseAbort ...                                                   */
/*    -------------------------------------------------------------    */
function parseAbort(token) {
   return parseAbortWeakabort.call(this, token, "ABORT");
}
   
/*---------------------------------------------------------------------*/
/*    parseWeakabort ...                                               */
/*---------------------------------------------------------------------*/
function parseWeakabort(token) {
   return parseAbortWeakabort.call(this, token, "WEAKABORT");
}

/*---------------------------------------------------------------------*/
/*    parseSuspend ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SUSPEND delay { stmt }                                      */
/*       | SUSPEND from delay to delay [emit <Identifier>()] { stmt }  */
/*       | SUSPEND toggle delay [emit <Identifier>()] { stmt }         */
/*                                                                     */
/*    (MS: I am not sure about the delay arguments. It looks like      */
/*    to me that immediate would be meaning less here.)                */
/*---------------------------------------------------------------------*/
function parseSuspend(token) {

   function parseEmitwhensuspended(inits) {
      if (isIdToken(this, this.peekToken(), "emit")) {
	 const loc = this.consumeAny().location
	 const id = this.consumeToken(this.ID);

      	 this.consumeToken(this.LPAREN);
      	 this.consumeToken(this.RPAREN);
	 inits.push(
	    astutils.J2SDataPropertyInit(
	       loc,
	       astutils.J2SString(loc, "emitwhensuspended"),
	       astutils.J2SString(id.location, id.value)))
      }
   }

   const loc = token.location;
   const tag = tagInit("suspend", loc);

   let delay;
   let inits = [locInit(loc)];
   let accessors = [];
   
   if (isIdToken(this, this.peekToken(), "from")) {
      // SUSPEND FROM delay TO delay [whenemitsuspended] BLOCK
      const { inits: from, accessors: afrom } =
	    parseDelay.call(
	       this, this.consumeAny().location, "SUSPEND", "fromApply");
      const tot = this.consumeAny();
      if (!isIdToken(this, tot, "to")) {
	 throw error.SyntaxError("SUSPEND: unexpected token `" + tot.value + "'",
				  tokenLocation(tot));
      }

      const { inits: to, accessors: ato } =
	    parseDelay.call(this, tot.location, "SUSPEND", "toApply");

      parseEmitwhensuspended.call(this, inits);
      
      inits = inits.concat(from);
      inits = inits.concat(to);
      accessors = afrom.concat(ato);
      accessors = [astutils.J2SArray(loc, afrom),
		    astutils.J2SArray(loc, ato)];
   } else if (isIdToken(this, this.peekToken(), "toggle")) {
      // SUSPEND TOGGLE delay [whenemitsuspended] BLOCK
      const tot = this.consumeAny();
      const { inits: toggle, accessors: atoggle } =
	    parseDelay.call(this, tot.location, "SUSPEND", "toggleApply", "toggleSignal");
      
      parseEmitwhensuspended.call(this, inits);

      inits = inits.concat(toggle);
      accessors = atoggle;
   } else {
      // SUSPEND delay BLOCK
      const { inits: is, accessors: aexpr } =
	    parseDelay.call(this, loc, "SUSPEND", "apply");

      inits = inits.concat(is);
      accessors = aexpr;
   }
   const stmts = parseHHBlock.call(this);

   const attrs = astutils.J2SObjInit(loc, inits, tag);
   return astutils.J2SCall(
      loc, hhref(loc, "SUSPEND"), null,
      [attrs].concat(accessors, stmts));
}

/*---------------------------------------------------------------------*/
/*    parseLoop ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | LOOP block                                                  */
/*---------------------------------------------------------------------*/
function parseLoop(token) {
   const loc = token.location;

   const stmts = parseHHBlock.call(this);
   const attrs = astutils.J2SObjInit(loc, [locInit(loc)]);
   
   return astutils.J2SCall(loc, hhref(loc, "LOOP"), 
			    null,
			    [attrs].concat(stmts));
}

/*---------------------------------------------------------------------*/
/*    parseEvery ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | every  delay block                                          */
/*---------------------------------------------------------------------*/
function parseEvery(token) {
   const loc = token.location;
   const tag = tagInit("every", loc);

   const { inits, accessors } = parseDelay.call(this, loc, "while");

   const stmts = parseHHBlock.call(this);
   const attrs = astutils.J2SObjInit(
      loc, [locInit(loc), tag].concat(inits));
   
   return astutils.J2SCall(loc, hhref(loc, "EVERY"), 
			    null,
			    [attrs].concat(accessors, stmts));
}

/*---------------------------------------------------------------------*/
/*    parseLoopeach ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | do block every delay                                        */
/*---------------------------------------------------------------------*/
function parseLoopeach(token) {
   const loc = token.location;
   const tag = tagInit("do/every", loc);
   const stmts = parseHHBlock.call(this);

   const tok = this.consumeToken(this.ID);
   
   if (tok.value != "every") throw tokenValueError(tok);
      
   const { inits, accessors } = parseDelay.call(this, loc, "do");

   const attrs = astutils.J2SObjInit(
      loc, [locInit(loc),tag].concat(inits));
   
   return astutils.J2SCall(loc, hhref(loc, "LOOPEACH"), 
			    null,
			    [attrs].concat(accessors, stmts));
}

/*---------------------------------------------------------------------*/
/*    parseExec ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | exec [ident] block                                          */
/*           [kill block] [suspend block] [resume block]               */
/*---------------------------------------------------------------------*/
function parseExec(token) {
   const loc = token.location;
   const tag = tagInit("async", loc);
   let inits = [locInit(loc), tag];
   
   this.consumeToken(this.LPAREN);
   if (this.peekToken().type === this.ID) {
      const id = this.consumeAny();

      // check for reserved exec keywords
      if ("res susp kill".indexOf(id.value) >= 0) {
	 throw error.SyntaxError("async: reserved identifier `" 
				  + id.value + "'",
				  tokenLocation(id));
      }
      
      inits.push(astutils.J2SDataPropertyInit(
	 loc, astutils.J2SString(loc, id.value),
	 astutils.J2SString(loc, "")));
   }
   this.consumeToken(this.RPAREN);
      
   const { block, accessors } = parseHHThisBlock.call(this);
   inits.push(astutils.J2SDataPropertyInit(
      loc, astutils.J2SString(loc, "apply"),
      astutils.J2SMethod(loc, "execfun", [], block, self(loc))));

   while (true) {
      if (isIdToken(this, this.peekToken(), "kill")) {
      	 this.consumeAny();
      	 const block = this.parseBlock();
      	 inits.push(astutils.J2SDataPropertyInit(
	 	       loc, astutils.J2SString(loc, "killApply"),
	 	       astutils.J2SMethod(loc, "execkill", [], block, self(loc))));
      } else if (isIdToken(this, this.peekToken(), "suspend")) {
      	 this.consumeAny();
      	 const block = this.parseBlock();
      	 inits.push(astutils.J2SDataPropertyInit(
	 	       loc, astutils.J2SString(loc, "suspApply"),
	 	       astutils.J2SMethod(loc, "execsusp", [], block, self(loc))));
      } else if (isIdToken(this, this.peekToken(), "resume")) {
      	 this.consumeAny();
      	 const block = this.parseBlock();
      	 inits.push(astutils.J2SDataPropertyInit(
	 	       loc, astutils.J2SString(loc, "resApply"),
	 	       astutils.J2SMethod(loc, "execresume", [], block, self(loc))));
      } else {
	 break;
      }
   }
   
   const attrs = astutils.J2SObjInit(loc, inits);
   
   return astutils.J2SCall(loc, hhref(loc, "EXEC"), null,
			    [attrs].concat(accessors));
}
   
/*---------------------------------------------------------------------*/
/*    parseRun ...                                                     */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | run dollarexpr(expr, ...) { sigalias, ... }                 */
/*    dollarexpr ::= $dollar | hhexpr                                  */
/*    sigalias ::= ident | ident to ident | ident from ident | *       */
/*---------------------------------------------------------------------*/
function parseRun(token) {
   const loc = token.location;
   const next = this.peekToken();
   const tag = tagInit("run", loc);
   let inits = [locInit(loc), tag];
   let exprs = [], axs = [], finits = [];

   // module expression
   const module = this.parsePrimaryDollar();
	 
   // variables
   this.consumeToken(this.LPAREN);
   
   for (let idx = 0; this.peekToken().type != this.RPAREN; idx++) {
      const { expr, accessors } = parseHHExpression.call(this);
      const loc = expr.loc;
      const assig = astutils.J2SStmtExpr(loc,
	 astutils.J2SAssig(
	    loc,
	    astutils.J2SAccess(
	       loc,
	       astutils.J2SUnresolvedRef(
		  loc, "__frame"),
	       astutils.J2SNumber(
		  loc, idx)),
	    expr));
      const init = astutils.J2SUndefined(loc);

      finits.push(init);
      exprs.push(assig);
      axs = axs.concat(accessors);
      
      if (this.peekToken().type === this.COMMA) {
	 this.consumeAny();
      }
   }

   this.consumeToken(this.RPAREN);
	 
   // sigaliases
   this.consumeToken(this.LBRACE);
   
   while (this.peekToken().type != this.RBRACE) {
      switch (this.peekToken().type) {
	 case this.MUL:
	    const d = this.consumeAny();
	    inits.push(astutils.J2SDataPropertyInit(
			   d.location, astutils.J2SString(d.location, "autocomplete"),
			   astutils.J2SBool(d.location, true)));
	    break;
	    
	 case this.ID:
	    const a = this.consumeAny();
	    
	    switch (this.peekToken().type) {
	       case this.COMMA:
	       case this.RBRACE:
		  inits.push(astutils.J2SDataPropertyInit(
				 a.location, astutils.J2SString(a.location, a.value),
				 astutils.J2SString(a.location, "")));
		  break;
		  
	       case this.ID:
		  const tok = this.consumeToken(this.ID);
		  const as = this.consumeToken(this.ID);

		  switch (tok.value) {
		     case "from": 
		     case "to": 
			inits.push(astutils.J2SDataPropertyInit(
				      a.location, astutils.J2SString(as.location, as.value),
				      astutils.J2SString(a.location, a.value)));
		     	break;
		     
		     default: 
			throw tokenTypeError(tok);
		  }
	    }
	    break;
	    
	    default:
	       throw tokenTypeError(this.consumeAny());
      }
      
      if (this.peekToken().type === this.COMMA) {
	 this.consumeAny();
      }
   }
      
   this.consumeToken(this.RBRACE);

   // run expression
   switch (typeof module) {
      case "J2SDollar":
	 inits.push(astutils.J2SDataPropertyInit(
		       loc, astutils.J2SString(loc, "module"),
		       module.node));
	 break;
	 
      case "J2SUnresolvedRef":
	 inits.push(astutils.J2SDataPropertyInit(
		       module.loc,
		       astutils.J2SString(loc, "module"),
		       astutils.J2SCall(loc, hhref(loc, "getModule"),
			  null,
			  [astutils.J2SString(loc, module.id),
			   location(module.loc)])));
	 break;

      default:
	 throw error.SyntaxError("RUN: bad module", tokenLocation(token));
   }
   
   const attrs = astutils.J2SObjInit(loc, inits);
   const run = astutils.J2SCall(loc, hhref(loc, "RUN"), null, [attrs]);
      	 
   if (exprs.length === 0) {
      return run;
   } else {
      const param = astutils.J2SDecl(loc, "__frame", "param");
      const frame = astutils.J2SDataPropertyInit(
	 loc, 
	 astutils.J2SString(loc, "%frame"),	
	 astutils.J2SRef(loc, param));
      const ablock = astutils.J2SBlock(
	 loc, loc, exprs);
      const tag = tagInit("hop", loc);
      const appl = astutils.J2SDataPropertyInit(
	 loc, 
	 astutils.J2SString(loc, "apply"),
	 astutils.J2SMethod(loc, "runfun", [], ablock, self(loc)));
      const attrs = astutils.J2SObjInit(
	 loc, [locInit(loc), tag, appl]);
      const atom = astutils.J2SCall(loc, hhref(loc, "ATOM"), null,
	 [attrs].concat(axs));
      const seqattrs = astutils.J2SObjInit(loc, 
	 [locInit(loc), tagInit("run", loc)]);
      const seq = astutils.J2SCall(
	 loc, hhref(loc, "SEQUENCE"),
	 null, [seqattrs, atom, run]);
      const ret = astutils.J2SReturn(loc, seq);
      const block = astutils.J2SBlock(loc, loc, [ret]);
      const fun = astutils.J2SFun(loc, "runfun", [param], block);
      const arg = astutils.J2SArray(loc, finits);

      inits.push(frame);
      
      return astutils.J2SCall(
	 loc, fun, [astutils.J2SUndefined(loc)], 
	 [arg]);
   }
}
   
/*---------------------------------------------------------------------*/
/*    parseOldRun ...                                                  */
/*---------------------------------------------------------------------*/
function parseOldRun(token) {
   const loc = token.location;
   const next = this.peekToken();
   const tag = tagInit("run", loc);
   let inits = [locInit(loc), tag];
   let exprs = [], axs = [], finits = [];
   
   const module = this.parsePrimaryDollar();
   
   switch (typeof module) {
      case "J2SDollar":
	 inits.push(astutils.J2SDataPropertyInit(
			loc, astutils.J2SString(loc, "module"),
			module.node));
	 break;
	 
      case "J2SUnresolvedRef":
	 inits.push(astutils.J2SDataPropertyInit(
			module.loc,
			astutils.J2SString(loc, "module"),
			astutils.J2SCall(loc, hhref(loc, "getModule"),
			   null,
			   [astutils.J2SString(loc, module.id),
			     location(module.loc)])));
	 break;

      default:
	 throw error.SyntaxError("RUN: bad module", tokenLocation(token));
   }
   
   this.consumeToken(this.LPAREN);
   
   for (let idx = 0; true; idx++) {
      switch (this.peekToken().type) {
	 case this.RPAREN:
	    break;
	    
	 case this.DOTS:
	    const d = this.consumeAny();
	    inits.push(astutils.J2SDataPropertyInit(
			   d.location, astutils.J2SString(d.location, "autocomplete"),
			   astutils.J2SBool(d.location, true)));
	    break;
	    
	 case this.ID:
	    const a = this.consumeAny();
	    
	    switch (this.peekToken().type) {
	       case this.COMMA:
	       case this.RPAREN:
		  inits.push(astutils.J2SDataPropertyInit(
				 a.location, astutils.J2SString(a.location, a.value),
				 astutils.J2SString(a.location, "")));
		  break;
		  
	       case this.EGAL:
		  const { expr, accessors } = parseHHExpression.call(this);
		  const assig = astutils.J2SStmtExpr(a.location,
		     astutils.J2SAssig(
		     	a.location,
		     	astutils.J2SAccess(
			   a.location,
			   astutils.J2SUnresolvedRef(
			      a.location, "__frame"),
			   astutils.J2SNumber(
			      a.location, idx)),
/* 			   astutils.J2SString(                         */
/* 			      a.location, a.value)),                   */
		     	expr));
		  const init = astutils.J2SDataPropertyInit(
		     a.location,
		     astutils.J2SString(a.location, a.value),
		     astutils.J2SUndefined(a.location));

		  finits.push(init);
		  exprs.push(assig);
		  axs = axs.concat(accessors);
		  break;
		  
	       case this.LARROW:
		  this.consumeAny();
		  const as = this.consumeToken(this.ID);
		  inits.push(astutils.J2SDataPropertyInit(
				 a.location, astutils.J2SString(as.location, as.value),
				 astutils.J2SString(a.location, a.value)));
		  break;
		  
	       default:
		  const as = this.consumeToken(this.ID);
		  
		  if (as.value !== "as") {
      		     throw tokenTypeError(this.consumeAny());
		  } else {
		     const as = this.consumeToken(this.ID);
	       	     inits.push(astutils.J2SDataPropertyInit(
		  		    a.location, astutils.J2SString(a.location, a.value),
		  		    astutils.J2SString(as.location, as.value)));
		  }
	    }
	    break;
	    
	    default:
	       throw tokenTypeError(this.consumeAny());
      }
      
      if (this.peekToken().type === this.RPAREN) {
	 this.consumeAny();
	    
	 const attrs = astutils.J2SObjInit(loc, inits);
	 const run = astutils.J2SCall(loc, hhref(loc, "RUN"), null,
	    [attrs].concat(axs));
	 
	 if (exprs.length === 0) {
	    return run;
	 } else {
	    const param = astutils.J2SDecl(loc, "__frame", "param");
	    const frame = astutils.J2SDataPropertyInit(
	       loc, 
	       astutils.J2SString(loc, "%frame"),	
	       astutils.J2SRef(loc, param));
	    
	    const ablock = astutils.J2SBlock(
	       loc, loc, exprs);
   	    const tag = tagInit("hop", loc);
   	    const appl = astutils.J2SDataPropertyInit(
      	       loc, 
      	       astutils.J2SString(loc, "apply"),
      	       astutils.J2SMethod(loc, "runfun", [], ablock, self(loc)));
   	    const attrs = astutils.J2SObjInit(
	       loc, [locInit(loc), tag, appl]);
	    const atom = astutils.J2SCall(loc, hhref(loc, "ATOM"), null,
	       [attrs].concat(axs));
	    const seqattrs = astutils.J2SObjInit(loc, 
	       [locInit(loc), tagInit("run", loc)]);

	    const seq = astutils.J2SCall(
	       loc, hhref(loc, "SEQUENCE"),
	       null, [seqattrs, atom, run]);
	    
      	    const ret = astutils.J2SReturn(loc, seq);
      	    const block = astutils.J2SBlock(loc, loc, [ret]);
      	    const fun = astutils.J2SFun(loc, "runfun", [param], block);
	    const arg = astutils.J2SObjInit(loc, finits);

	    inits.push(frame);
	    
      	    return astutils.J2SCall(
	       loc, fun, [astutils.J2SUndefined(loc)], 
	       [arg]);
	 }
      } else {
	 this.consumeToken(this.COMMA);
      }
   }
}

/*---------------------------------------------------------------------*/
/*    parseLet ...                                                     */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | { let id [= val], ... ; ... }                               */
/*---------------------------------------------------------------------*/
function parseLet(token, binder) {
   const loc = token.location;

   function parseLetInit(loc) {
      if (this.peekToken().type === this.EGAL) {
	 this.consumeAny();
	 return parseHHExpression.call(this);
      } else {
	 return { expr: astutils.J2SUndefined(loc), accessors: [] };
      }
   }
   
   function initVar(tok, expr, accessors) {
      const loc = tok.location;
      const assig = astutils.J2SAssig(loc, 
	 astutils.J2SUnresolvedRef(loc, tok.value),
	 expr);
      const block = astutils.J2SBlock(loc, assig.loc, [astutils.J2SStmtExpr(loc, assig)]);
      const appl = astutils.J2SDataPropertyInit(
      	 loc, 
      	 astutils.J2SString(loc, "apply"),
      	 astutils.J2SMethod(loc, "atomfun", [], block, self(loc)));
      const tag = tagInit("hop", loc);
      const attrs = astutils.J2SObjInit(loc, [locInit(loc), tag, appl]);
      return astutils.J2SCall(loc, hhref(loc, "ATOM"), null,
	 [attrs].concat(accessors));
   }
   
   function parseDecls() {
      let decls = [];
      let inits = [];

      while (true) {
	 const t = this.consumeToken(this.ID);
	 const iloc = t.location;
	 const { expr, accessors } = parseLetInit.call(this, iloc);
	 const decl = astutils.J2SDeclInitScope(iloc, t.value, 
	    astutils.J2SUndefined(loc), 
	    "letblock", "let-opt");
	 const init = initVar(t, expr, accessors);
	 
	 inits.push(init);
	 decls.push(decl);
	 
	 switch (this.peekToken().type) {
	    case this.SEMICOLON:
	       this.consumeAny();
	       return { decls, inits, accessors };
	       
	    case this.COMMA:
	       this.consumeAny();
	       break;
	       
	    default:
	       throw tokenTypeError(this.consumeAny());
	 }
      }
   }

   const { decls, inits } = parseDecls.call(this);
   const stmts = inits.concat(parseHHBlock.call(this, false));
   const attrs = astutils.J2SObjInit(loc, [locInit(loc)]);
   const seqattrs = astutils.J2SObjInit(loc, 
      [locInit(loc), tagInit("let", loc)]);
   const stmt = astutils.J2SCall(loc, hhref(loc, "SEQUENCE"), null, 
      [seqattrs].concat(stmts));
   const ret = astutils.J2SReturn(loc, stmt);
   const block = astutils.J2SLetBlock(loc, loc, decls, [ret]);
   const fun = astutils.J2SMethod(loc, "letfun", [], block, self(loc));
				
   return astutils.J2SCall(loc, fun, [astutils.J2SUndefined(loc)], []);
}

/*---------------------------------------------------------------------*/
/*    parseSignal ...                                                  */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | { signal id [= val], ; ... }                                */
/*       | { signal implements intf, ; ... }                           */
/*---------------------------------------------------------------------*/
function parseSignal(token) {
   const loc = token.location;

   function signal(loc, name, direction, init, accessors) {
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "name"),
	 astutils.J2SString(loc, name));
      const inits = [id];

      if (init) {
	 const func = astutils.J2SMethod(
		  loc, "initfunc", [],
		  astutils.J2SBlock(
		     loc, loc,
		     [astutils.J2SReturn(loc, init)]),
	          self(loc));
	 const initfunc = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString(loc, "init_func"),
	    func);

	 inits.push(initfunc);
      }
      
      if (isIdToken(this, this.peekToken(), "combine")) {
	 const locc = this.consumeAny().location;
	 const fun = this.parseCondExpression();

	 const combine = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString(loc, "combine_func"),
	    fun);
	 inits.push(combine);
      }

      const attrs = astutils.J2SObjInit(loc, inits);
      return astutils.J2SCall(loc, hhref(loc, "SIGNAL"), null,
			       [attrs].concat(accessors));
   }

   function parseSiglist() {
      let args = [];

      while (true) {
	 const t = this.consumeToken(this.ID);
	 
	 if (t.value === "implements") {
	    args = args.concat(parseInterfaceIntflist.call(this));
	 } else {
	    if (this.peekToken().type === this.EGAL) {
	       this.consumeAny();
	       const { expr, accessors } = parseHHExpression.call(this);
	       args.push(signal.call(this, t.location, t.value, "INOUT", expr, accessors));
	    } else {
	       args.push(signal.call(this, t.location, t.value, "INOUT", false, []));
	    }
	 }
	 switch (this.peekToken().type) {
	    case this.SEMICOLON:
	       this.consumeAny();
	       return args;
	       
	    case this.COMMA:
	       this.consumeAny();
	       break;
	       
	    default:
	       throw tokenTypeError(this.consumeAny());
	 }
      }
   }

   const tag = tagInit("signal", loc);
   const attrs = astutils.J2SObjInit(loc, [locInit(loc), tag]);
   const args = parseSiglist.call(this);
   const stmts = parseHHBlock.call(this, false);

   return astutils.J2SCall(loc, hhref(loc, "LOCAL"), 
			    null,
			    [attrs].concat(args, stmts));
}

/*---------------------------------------------------------------------*/
/*    parseTrap ...                                                    */
/*---------------------------------------------------------------------*/
function parseTrap(token) {
   const col = this.consumeToken(this.COLUMN);
   const block = parseStmt.call(this, this.peekToken, false);
   const loc = token.location;
   const attrs = astutils.J2SObjInit(
      loc,
      [astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, token.value),
	 astutils.J2SString(loc, token.value)),
	locInit(loc), tagInit(token.value, loc)]);
   
   return astutils.J2SCall(loc, hhref(loc, "TRAP"), 
			    null,
			    [attrs].concat([block]));
}

/*---------------------------------------------------------------------*/
/*    parseStmt ...                                                    */
/*---------------------------------------------------------------------*/
function parseStmt(token, declaration) {
   const next = this.consumeAny();

   switch (next.type) {
      case this.ID:
	 switch (next.value) {
	    case "host":
	    case "hop":
	       return parseAtom.call(this, next);
	    case "module":
	      return parseMachineModule.call(this, next, declaration, "MODULE");
	    case "halt":
	       return parseHalt.call(this, next);
	    case "fork":
	       return parseFork.call(this, next);
	    case "emit":
	       return parseEmit.call(this, next);
	    case "sustain":
	       return parseSustain.call(this, next);
	    case "abort":
	       return parseAbort.call(this, next);
	    case "weakabort":
	       return parseWeakabort.call(this, next);
	    case "suspend":
	       return parseSuspend.call(this, next);
	    case "loop":
	       return parseLoop.call(this, next);
	    case "every":
	       return parseEvery.call(this, next);
	    case "async":
	       return parseExec.call(this, next);
	    case "run":
	       return parseRun.call(this, next);
	       
	    default:
	       if (this.peekToken().type === this.COLUMN) {
		  return parseTrap.call(this, next);
	       } else {
		  throw tokenValueError(next);
	       }
	 }
	 
      case this.do:
	 return parseLoopeach.call(this, next);
	 
      case this.if:
	 return parseIf.call(this, next);
	 
      case this.break:
	 return parseExit.call(this, next);
	 
      case this.yield:
	 return parsePause.call(this, next);
	 
      case this.await:
	 return parseAwait.call(this, next);
	 
      case this.DOLLAR: {
	    const expr = this.parseExpression();
	    this.consumeToken(this.RBRACE);
	    return expr;
	 }

      case this.LBRACE:
	 return parseSequence.call(this, next, "sequence", false, false);

      case this.STRING:
	 return parseNamedSequence.call(this, next, "sequence", false);
	 
      default:
	 throw tokenTypeError(this.consumeAny());
   }
}

/*---------------------------------------------------------------------*/
/*    parseHiphopValue ...                                             */
/*---------------------------------------------------------------------*/
function parseHiphopValue(token, declaration, conf) {
   
   function wrapVarDecl(val) {
      if (val instanceof ast.J2SVarDecls) {
	 return hhwrapDecl(token, val);
      } else {
	 return hhwrapExpr(token, val);
      }
   }
   
   const next = this.peekToken();

   if (next.type === this.ID && next.value === "machine") {
      this.consumeAny();
      return wrapVarDecl(parseMachineModule.call(this, next, declaration, "MACHINE"));
   } else if (next.type === this.ID && next.value === "module") {
      this.consumeAny();
      return wrapVarDecl(parseMachineModule.call(this, next, declaration, "MODULE"));
   } else if (next.type === this.ID && next.value === "interface") {
      this.consumeAny();
      return wrapVarDecl(parseInterface.call(this, next, declaration));
   } else {
      return hhwrapExpr(token, parseStmt.call(this, token, declaration));
   }
}

/*---------------------------------------------------------------------*/
/*    hiphopInit ...                                                   */
/*---------------------------------------------------------------------*/
function hiphopInit(loc) {
   const nm = astutils.J2SImportName(loc, Symbol("*"), "$$hiphop");
   
   return astutils.J2SImport(loc, hhmodulePath, [nm]);
}
   
/*---------------------------------------------------------------------*/
/*    parseHiphopInit ...                                              */
/*---------------------------------------------------------------------*/
function parseHiphopInit(token, declaration, conf) {
   return hiphopInit(token.location);
}

/*---------------------------------------------------------------------*/
/*    parseHiphop ...                                                  */
/*---------------------------------------------------------------------*/
function parseHiphop(token, declaration, conf) {
   switch (declaration) {
      case "module": return parseHiphopInit.call(this, token, declaration, conf);
      case "function": return false;
      default: return parseHiphopValue.call(this, token, declaration, conf);
   }
}

/*---------------------------------------------------------------------*/
/*    script ...                                                       */
/*---------------------------------------------------------------------*/
function script(attrs) {
   if (attrs.type !== "module") {
      console.log(attrs['%location']);
      throw new TypeError(`wrong script type "${attrs.type || "inline"} (should be "module")"`,
	 attrs['%location']?.filename || "inline",
         attrs['%location']?.pos || -1);
   } else {
      return 'import * as $$hiphop from "' + hhmodulePath + '";';
   }
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
parser.addPlugin("@hop/hiphop", parseHiphop);
parser.addPlugin("hiphop", parseHiphop);

exports.parser = parser;
exports.parse = parser.parse.bind(parser);
exports.parseString = parser.parseString.bind(parser);
exports.script = script;
exports.setHHModulePath = setHHModulePath;

