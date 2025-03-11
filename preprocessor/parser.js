/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/preprocessor/parser.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 17:53:13 2018                          */
/*    Last change :  Mon Feb 17 14:42:45 2025 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop parser based on the genuine Hop parser                    */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
import { hhaccess } from "./hhaccess.js";
import * as astutils from "./astutils.js";
import { Parser, ast, list } from "@hop/hopc";
import * as error from "../lib/error.js";

/*---------------------------------------------------------------------*/
/*    parser                                                           */
/*---------------------------------------------------------------------*/
export const parser = new Parser();

/*---------------------------------------------------------------------*/
/*    global variables                                                 */
/*---------------------------------------------------------------------*/
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
export function setHHModulePath(path) {
   hhmodulePath = path;
}   
   
/*---------------------------------------------------------------------*/
/*    self ...                                                         */
/*---------------------------------------------------------------------*/
function self(loc) {
   return astutils.J2SDecl(loc, "this", "let-opt", "this");
}

/*---------------------------------------------------------------------*/
/*    normalizeLoc ...                                                 */
/*---------------------------------------------------------------------*/
function normalizeLoc(loc) {
   if (loc?.filename) {
      // native location must be transformed into Hop native locations
      return list.list("at", loc.filename, loc.offset);
   } else {
      return loc;
   }
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
   if ("loc" in token) {
      return { filename: token.loc.filename, pos: token.loc.offset };
   } else {
      return { filename: token.filename, pos: token.pos };
   }
}

/*---------------------------------------------------------------------*/
/*    tokenValueError ...                                              */
/*---------------------------------------------------------------------*/
function tokenValueError(token) {
   return error.SyntaxError("unexpected token `" + token.value + "'.",
			    tokenLocation(token));
}

/*---------------------------------------------------------------------*/
/*    tokenTypeError ...                                               */
/*---------------------------------------------------------------------*/
function tokenTypeError(token) {
   return error.SyntaxError("unexpected token `" + token.type + "'.",
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
/*    parseDollarIdentName ...                                         */
/*    -------------------------------------------------------------    */
/*    $name ::= ident | ${stmt}                                        */
/*---------------------------------------------------------------------*/
function parseDollarIdentName() {
   switch (this.peekToken().type) {
      case this.ID: {
	 const token = this.consumeAny();
	 return astutils.J2SString(token.location, token.value);
      }
      case this.DOLLAR: {
	 return this.parsePrimaryDollar().node;
      }
      default: {
	 throw tokenTypeError(this.peekToken());
      }
   }
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
   const { expr, signames } = hhaccess(e, iscnt, hhname, accessors);

   // The vector signames is a list of { id, exprs }. It corresponds
   // to all the accesses of the form "this[expr].(nowval|preval|...)".
   // This signames are ultimately handled by function wrapSignalNames
   // defined below
   return { expr, accessors, signames };
}

/*---------------------------------------------------------------------*/
/*    parseHHThisBlock ...                                             */
/*    -------------------------------------------------------------    */
/*    Parse JS block with augmented expressions as in parseHHThisExpr  */
/*    -------------------------------------------------------------    */
/*    See parseHHThisExpr (for the purpose of signames).               */
/*---------------------------------------------------------------------*/
function parseHHThisBlock() {
   let accessors = [];
   const { expr, signames } = hhaccess(this.parseBlock(), false, hhname, accessors);
   return { block: expr, accessors, signames };
}

/*---------------------------------------------------------------------*/
/*    wrapSignalNames ...                                              */
/*    -------------------------------------------------------------    */
/*    Takes a list of { id, field }, a node and builds the following   */
/*    ((id0, id1, ...) => node)(field0, field1, ...)                   */
/*    -------------------------------------------------------------    */
/*    See parseHHThisExpr.                                             */
/*---------------------------------------------------------------------*/
function wrapSignalNames(expr, signames) {
   if (signames.length === 0) {
      return expr;
   } else {
      const loc = normalizeLoc(expr.loc);
      const formals = signames.map(s => astutils.J2SDecl(loc, s.id, "param"));
      const actuals = signames.map(s => s.field);
      const block = astutils.J2SBlock(loc, loc, [astutils.J2SReturn(loc, expr)]);
      const arrow = astutils.J2SArrow(loc, "signames", formals, block);

      return astutils.J2SCall(loc, arrow, null, actuals);
   }
}

/*---------------------------------------------------------------------*/
/*    parseHHExpression ...                                            */
/*---------------------------------------------------------------------*/
function parseHHExpression(unwrapDollar = true) {
   return parseHHThisExpr.call(this, accessors => {
      if (this.peekToken().type === this.DOLLAR) {
	 const dollar = this.parseDollarExpression();
	 const expr = unwrapDollar ? dollar.node : dollar;
	 return { expr, accessors };
      } else {
	 const expr = this.parseCondExpression();
	 return { expr, accessors };
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
	    const expr = this.parseDollarExpression().node;
	    return { expr, accessors };
	 } else {
	    const expr = this.parseCondExpression();
	    return { expr, accessors };
	 }
      },
      iscnt);
}

/*---------------------------------------------------------------------*/
/*    parseValueApply ...                                              */
/*---------------------------------------------------------------------*/
function parseValueApply(loc) {
   const { expr, accessors, signames } = parseHHExpression.call(this, false);
   let init;
   if (typeof expr === "J2SDollar" || expr?.$class === "J2SDollar") {
      init = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "%value"),
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
   return { init, accessors, signames }
}
   
/*---------------------------------------------------------------------*/
/*    parseDelay ...                                                   */
/*    -------------------------------------------------------------    */
/*    delay ::= (hhexpr)                                               */
/*       | count(hhexpr, hhexpr)                                       */
/*       | immediate count(hhexpr, hhexpr)                             */
/*       | immediate(hhexpr)                                           */
/*---------------------------------------------------------------------*/
function parseDelay(loc, tag, action = "apply", id = false, immediate = false) {
   if (isIdToken(this, this.peekToken(), "count")) {
      // COUNT(hhexpr, hhexpr)
      const loccnt = this.consumeAny();
      this.consumeToken(this.LPAREN);
      const { expr: count, accessors: cntaccessors, signames: signames1 } =
	 parseHHCondExpression.call(this, true, false);
      this.consumeToken(this.COMMA);
      const { expr, accessors, signames: signames2 } =
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
	    astutils.J2SBool(loc, immediate)), 
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString(loc, action),
	    fun),
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString(loc, "count" + action),
	    cntfun)];

      return { inits: inits, accessors: cntaccessors.concat(accessors), signames: signames1.concat(signames2) };
   } else if (isIdToken(this, this.peekToken(), "immediate")) {
      // immediate(hhexpr)
      const imm = this.consumeAny();
      return parseDelay.call(this, loc, tag, action, id, true);
   } else {

      // hhexpr
      this.consumeToken(this.LPAREN);
      const { expr, accessors, signames } = parseHHExpression.call(this, true);
      this.consumeToken(this.RPAREN);
      
      let inits;

      if (typeof expr === "J2SUnresolvedRef" || expr?.$class === "J2SUnresolvedRef") {
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
      return { inits: inits, accessors: accessors, signames };
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
	       return [parseEmpty(nothing, "NOTHING", "NOTHING")];
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
/*    parseModule ...                                                  */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | MODULE [ident] (sig-or-vdecl, ...)                          */
/*           [implements dollarexpr, ...] block                        */
/*    intf ::= [mirror] ident | [mirror] $dollar                       */
/*    sig-or-vdecl ::= signal | vdecl                                  */
/*    signal ::= [direction] ident [combine]                           */
/*    vdecl ::= var ident                                              */
/*    direction ::= in | out | inout                                   */
/*    combine ::= combine expr                                         */
/*---------------------------------------------------------------------*/
function parseModule(token, declaration, ctor) {
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
   const sigs = parseModuleSiglist.call(this, false).concat(esigs);
   
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
				 astutils.J2SUnresolvedRef(loc, "__frame"),
				 astutils.J2SString(loc, "length"))),
			   astutils.J2SAccess(loc,
			      astutils.J2SUnresolvedRef(loc, "__frame"),
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
         loc, [astutils.J2SDeclInit(loc, id.value, mod, "let", true)]);
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
   let sigs = parseModuleSiglist.call(this, true);
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
      let expr = this.parseCondExpression();
      
      const attrs = astutils.J2SObjInit(
	 loc,
	 [astutils.J2SDataPropertyInit(
	      loc,
	      astutils.J2SString(loc, "%value"),
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
function parseModuleSiglist(interfacep) {

   function direction(token) {
      if (token.type === this.in) {
	 return "IN"
      } else if (token.type === this.ID) {
	 switch (token.value) {
	    case "out": {
	       return "OUT"
	       break;
	    }
	    case "inout": {
	       return "INOUT"
	       break;
	    }
	    default: {
	       return "INOUT"
	    }
	 }
      } else {
	 throw tokenTypeError(token)
      }
   }
      
   function parseSignalModule(token) {
      const loc = token.location;
      let signame = parseDollarIdentName.call(this);
      
      const dir = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "direction"),
	 astutils.J2SString(loc, direction.call(this, token)));

      let accessors = [];
      let signames = [];
      let node;
      
      if (this.peekToken().type === this.EGAL) {
	 this.consumeAny();
	 const { expr, accessors: axs, signames: sigs } =
	    parseHHExpression.call(this, true);
	 signames = sigs;
	 accessors = axs;

	 node = parseSigAttr.call(this, loc, signame, expr, axs, dir);
      } else {
	 node = parseSigAttr.call(this, loc, signame, false, [], dir);
      }

      return wrapSignalNames(node, signames);
   }

   function parseDotSignalsModule(token) {
      // example:
      // ... ${expr} = new Set() combine (x, y) => x.union(y)
      //  =>
      // expr.map(n => hh.SIGNAL({name: n, initFunc: () => newSet(), ...));

      const loc = this.consumeAny().location;
      const dir = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "direction"),
	 astutils.J2SString(loc, direction.call(this, token)));
      
      const name = "n";
      const arg = astutils.J2SUnresolvedRef(loc, name);
      const formal = astutils.J2SDecl(loc, name, "param");
      let arr = [];

      if (this.peekToken().type === this.DOLLAR) {
	 const { expr, accessors } = parseHHExpression.call(this, true);
	 arr = expr;
      } else {
	 let els = [];
	 while (true) {
	    els.push(astutils.J2SString(loc, this.consumeToken(this.ID).value));
	    if (this.peekToken().type === this.COMMA) {
	       this.consumeAny();
	    } else {
	       break;
	    }
	 }
	 arr = astutils.J2SArray(loc, els);
      }

      const m = astutils.J2SAccess(loc, arr, astutils.J2SString(loc, "map"));
      
      if (this.peekToken().type === this.EGAL) {
	 this.consumeAny();
	 const { expr, accessors: axs, signames } =
	    parseHHExpression.call(this, true);

	 const node = parseSigAttr.call(this, loc, arg, expr, axs, dir);
	 const block = astutils.J2SBlock(loc, loc, [astutils.J2SReturn(loc, node)]);
	 const arrow = astutils.J2SArrow(loc, "sig", [ formal ], block);
	 const call =  astutils.J2SCall(loc, m, null, [ arrow ]);
	 return wrapSignalNames(call, signames);
      } else {
	 const node = parseSigAttr.call(this, loc, arg, false, [], dir);
	 const block = astutils.J2SBlock(loc, loc, [astutils.J2SReturn(loc, node)]);
	 const arrow = astutils.J2SArrow(loc, "sig", [ formal ], block);
	 return astutils.J2SCall(loc, m, null, [ arrow ]);
      }
   }

   function isInOut(token) {
      return token.type === this.in
	 || (token.type === this.ID
	    && (token.value === "out" || token.value === "inout"));
   }
   
   let sigs = [];

   while (true) {
      if (isInOut.call(this, this.peekToken())) {
	 const tok = this.consumeAny();

	 if (this.peekToken().type === this.DOTS) {
	    sigs = sigs.concat(parseDotSignalsModule.call(this, tok));
	 } else {
	    while (true) {
	       sigs.push(parseSignalModule.call(this, tok));
	       if (this.peekToken().type === this.COMMA) { 
		  this.consumeAny();
	       } else {
		  break;
	       }
	    }
	 }
	 if (interfacep && this.peekToken().type === this.RBRACE) {
	    break;
	 }
	 this.consumeToken(this.SEMICOLON);
      } else {
	 break;
      }
   }
   
   return sigs;
}

/*---------------------------------------------------------------------*/
/*    parsePragma ...                                                  */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | pragma statement                                            */
/*---------------------------------------------------------------------*/
function parsePragma(token) {
   
   function parsePragmaBlock(loc) {
      return parseHHThisBlock.call(this);
   }

   const loc = token.location;
   const { block, accessors, signames } = parsePragmaBlock.call(this, loc);
   const appl = astutils.J2SDataPropertyInit(
      loc, 
      astutils.J2SString(loc, "apply"),
      astutils.J2SMethod(loc, "atomfun", [], block, self(loc)));
   const tag = tagInit("pragma", loc);
   const attrs = astutils.J2SObjInit(loc, [locInit(loc), tag, appl]);
   const node = astutils.J2SCall(loc, hhref(loc, "ATOM"), null,
				 [attrs].concat(accessors));
   return wrapSignalNames(node, signames);
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
	locInit(loc), tagInit("EXIT", loc)]);
   
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
   const dollar = this.peekToken().type === this.DOLLAR;
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

   if (body.length === 1 && !id && !dollar) {
      return body[0];
   } else {
      return astutils.J2SCall(loc, hhref(loc, "SEQUENCE"), 
			      null,
			      [attrs].concat(body));
   }
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
   const tag = tagInit("FORK", loc);
   const tagseq = tagInit("SEQUENCE", loc);
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
      const block = parseHHBlock.call(this);

      if (block.length === 1) {
	 body.push(block[0]);
      } else {
	 body.push(astutils.J2SCall(loc, hhref(loc, "SEQUENCE"),
				    null,
				    [astutils.J2SObjInit(loc, [locInit(loc), tagseq])]
				       .concat(block)));
      }

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
      const locid = this.peekToken().location;
      const signame = parseDollarIdentName.call(this);
      const tag = tagInit(command.toUpperCase(), loc);
      let inits = [locInit(locid), tag, astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString(locid, "signame"),
	 signame)];
      let accessors = [];
      let signames = [];

      const lparen = this.consumeToken(this.LPAREN);
	 
      if (this.peekToken().type !== this.RPAREN) {
	 const ll = lparen.location;
	 const { init: val, accessors: axs, signames: sns } = parseValueApply.call(this, ll);
	 const rparen = this.consumeToken(this.RPAREN);

	 inits.push(val);
	 signames = sns;
	 accessors = axs;
      } else {
	 this.consumeAny();
      }

      const node = astutils.J2SCall(
	 loc, hhref(loc, command), null,
	 [astutils.J2SObjInit(loc, inits)].concat(accessors));
      return { node, signames };
   }

   const loc = token.location;
   let locinit = locInit(loc);
   let { node, signames } = parseSignalEmit.call(this, loc);
   let nodes = [ node ];

   return wrapSignalNames(nodes[0], signames);
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
   const { inits, accessors, signames } = parseDelay.call(this, loc, "AWAIT", "apply");
   const node = astutils.J2SCall(
      loc, hhref(loc, "AWAIT"),
      null,
      [astutils.J2SObjInit(loc, [locInit(loc), tag].concat(inits))]
	 .concat(accessors));
   return wrapSignalNames(node, signames);
}

/*---------------------------------------------------------------------*/
/*    parseDollarStatement ...                                         */
/*---------------------------------------------------------------------*/
function parseDollarStatement(token) {
   const loc = token.location;
   const expr = this.parseExpression();
   const attrs = astutils.J2SObjInit(loc, [locInit(loc), tagInit("dollar", loc)]);
   this.consumeToken(this.RBRACE);
   return astutils.J2SCall(loc, hhref(loc, "SEQUENCE"), null, [attrs, expr]);
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
   const { init, accessors, signames } = parseValueApply.call(this, loc);
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

   const node = astutils.J2SCall(loc, hhref(loc, "IF"), null, args)
   
   return wrapSignalNames(node, signames);
}

/*---------------------------------------------------------------------*/
/*    parseAbortWeakabort ...                                          */
/*    stmt ::= ...                                                     */
/*       | ABORT delay block                                           */
/*       | WEAKABORT delay block                                       */
/*---------------------------------------------------------------------*/
function parseAbortWeakabort(token, command) {
   const loc = token.location;
   const tag = tagInit(command.toUpperCase(), loc);
   const { inits, accessors, signames } = parseDelay.call(this, loc, tag, "apply");
   const stmts = parseHHBlock.call(this);
   const node = astutils.J2SCall(
      loc, hhref(loc, command), null,
      [astutils.J2SObjInit(loc, [locInit(loc), tag].concat(inits))]
	 .concat(accessors)
	 .concat(stmts));

   return wrapSignalNames(node, signames);
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
   let signames = [];
   
   if (isIdToken(this, this.peekToken(), "from")) {
      // SUSPEND FROM delay TO delay [whenemitsuspended] BLOCK
      const { inits: from, accessors: afrom, signames: signamesfrom } =
	    parseDelay.call(
	       this, this.consumeAny().location, "SUSPEND", "fromApply");
      const tot = this.consumeAny();
      if (!isIdToken(this, tot, "to")) {
	 throw error.SyntaxError("SUSPEND: unexpected token `" + tot.value + "'.",
				  tokenLocation(tot));
      }

      const { inits: to, accessors: ato, signames: signamesto } =
	    parseDelay.call(this, tot.location, "SUSPEND", "toApply");

      parseEmitwhensuspended.call(this, inits);
      
      inits = inits.concat(from);
      inits = inits.concat(to);
      accessors = afrom.concat(ato);
      accessors = [astutils.J2SArray(loc, afrom),
		   astutils.J2SArray(loc, ato)];
      signames = signamesfrom.concat(signamesto);
   } else if (isIdToken(this, this.peekToken(), "toggle")) {
      // SUSPEND TOGGLE delay [whenemitsuspended] BLOCK
      const tot = this.consumeAny();
      const { inits: toggle, accessors: atoggle, signames: signamestoggle } =
	    parseDelay.call(this, tot.location, "SUSPEND", "toggleApply", "toggleSignal");
      
      parseEmitwhensuspended.call(this, inits);

      inits = inits.concat(toggle);
      accessors = atoggle;
      signames = signamestoggle;
   } else {
      // SUSPEND delay BLOCK
      const { inits: is, accessors: aexpr, signames: signamessuspend } =
	    parseDelay.call(this, loc, "SUSPEND", "apply");

      inits = inits.concat(is);
      accessors = aexpr;
      signames = signamessuspend;
   }
   const stmts = parseHHBlock.call(this);

   const attrs = astutils.J2SObjInit(loc, inits, tag);
   const node = astutils.J2SCall(
      loc, hhref(loc, "SUSPEND"), null,
      [attrs].concat(accessors, stmts));
   return wrapSignalNames(node, signames);
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
/*       | every delay block                                           */
/*---------------------------------------------------------------------*/
function parseEvery(token) {
   const loc = token.location;
   const tag = tagInit("EVERY", loc);

   const { inits, accessors, signames } = parseDelay.call(this, loc, "every");

   const stmts = parseHHBlock.call(this);
   const attrs = astutils.J2SObjInit(
      loc, [locInit(loc), tag].concat(inits));
   
   const node = astutils.J2SCall(loc, hhref(loc, "EVERY"), 
				 null,
				 [attrs].concat(accessors, stmts));
   return wrapSignalNames(node, signames);
}

/*---------------------------------------------------------------------*/
/*    parseLoopeach ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | do block every delay                                        */
/*---------------------------------------------------------------------*/
function parseLoopeach(token) {
   const loc = token.location;
   const tag = tagInit("LOOPEACH", loc);
   const stmts = parseHHBlock.call(this);

   const tok = this.consumeToken(this.ID);
   
   if (tok.value != "every") throw tokenValueError(tok);
      
   const { inits, accessors, signames } = parseDelay.call(this, loc, "do");

   const attrs = astutils.J2SObjInit(
      loc, [locInit(loc),tag].concat(inits));
   
   const node = astutils.J2SCall(loc, hhref(loc, "LOOPEACH"), 
				 null,
				 [attrs].concat(accessors, stmts));
   return wrapSignalNames(node, signames);
}

/*---------------------------------------------------------------------*/
/*    parseAsync ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | async ([ident]) block                                       */
/*           [kill block] [suspend block] [resume block]               */
/*---------------------------------------------------------------------*/
function parseAsync(token) {
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
      
   const { block, accessors, signames } = parseHHThisBlock.call(this);
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
   const node = astutils.J2SCall(loc, hhref(loc, "EXEC"), null,
				  [attrs].concat(accessors));
   return wrapSignalNames(node, signames);
}

/*---------------------------------------------------------------------*/
/*    parseRunFunExpression ...                                        */
/*---------------------------------------------------------------------*/
function parseRunFunExpression(loc, expr, parent) {
   if (!(expr instanceof ast.J2SCall) && expr?.$class !== "J2SCall" && (typeof expr) !== "J2SCall") {
      // Nodejs and Hop do not represent the AST with the same data
      // structure. This is why we have to make several check here
      throw error.SyntaxError("wrong run expression token `"
	 + (expr instanceof ast.J2SNode ? expr.generate() : typeof expr)
	 + "'", loc);
   } else if (!(expr instanceof ast.J2SBindExit) && expr?.$class !== "J2SBindExit" && (typeof expr) !== "J2SBindExit") {
      return 
   } else {
      return { expr, parent };
   }
}

/*---------------------------------------------------------------------*/
/*    parseRunFun ...                                                  */
/*---------------------------------------------------------------------*/
function parseRunFun(next) {
   switch (next.type) {
      case this.ID: {
	 const token = this.consumeAny();
	 const loc = normalizeLoc(token.location);
	 return astutils.J2SUnresolvedRef(loc, token.value);
      }
      case this.DOLLAR: {
	 return this.parsePrimaryDollar().node;
      }
      default:  { 
	 throw tokenTypeError(this.consumeAny());
      }
   }
}
   
/*---------------------------------------------------------------------*/
/*    parseRun ...                                                     */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | run id(expr, ...) { sigalias, ... }                         */
/*    sigalias ::= ident | ident as ident | *                          */
/*---------------------------------------------------------------------*/
function parseRun(token) {
   const loc = normalizeLoc(token.location);
   const next = this.peekToken();
   const tag = tagInit("run", loc);
   let inits = [locInit(loc), tag];
   let exprs = [], axs = [], finits = [];
   let signames = [];
   
   // module expression
   const exprFun = parseRunFun.call(this, next);
	 
   // variables
   this.consumeToken(this.LPAREN);
   
   for (let idx = 0; this.peekToken().type != this.RPAREN; idx++) {
      const { expr, accessors, signames: sigs } =
	 parseHHExpression.call(this, true);
      const loc = normalizeLoc(expr.loc);
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
      signames = signames.concat(sigs);
      
      if (this.peekToken().type === this.COMMA) {
	 this.consumeAny();
      }
   }

   this.consumeToken(this.RPAREN);
	 
   // sigaliases
   switch (this.peekToken().type) {
      case this.LBRACE: {
	 this.consumeToken(this.LBRACE);
	 
	 while (this.peekToken().type != this.RBRACE) {
	    switch (this.peekToken().type) {
	       case this.MUL:
		  const dm = this.consumeAny();
		  inits.push(astutils.J2SDataPropertyInit(
		     dm.location, astutils.J2SString(dm.location, "autocomplete"),
		     astutils.J2SBool(dm.location, true)));
		  break;
		  
	       case this.PLUS:
		  const dp = this.consumeAny();
		  inits.push(astutils.J2SDataPropertyInit(
		     dp.location, astutils.J2SString(dp.location, "autocompletestrict"),
		     astutils.J2SBool(dp.location, true)));
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
			   case "as": 
			      inits.push(astutils.J2SDataPropertyInit(
				 a.location, astutils.J2SString(as.location, as.value),
				 astutils.J2SString(a.location, a.value)));
			      if (this.peekToken().type !== this.COMMA
				 && this.peekToken().type !== this.RBRACE) {
				 throw tokenTypeError(this.consumeAny());
			      }
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
	 break;
      }

      case this.DOLLAR: {
	 const loc = this.peekToken().location;
	 const aliases = this.parsePrimaryDollar().node;
	 inits.push(astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString(loc, "aliases"),
	    aliases));
	 break;
      }

      default: {
	 throw tokenTypeError(this.peekToken());
      }
   }

   // run expression
   inits.push(astutils.J2SDataPropertyInit(
      loc, astutils.J2SString(loc, "module"),
      exprFun));

   const param = astutils.J2SDecl(loc, "__frame", "param");
   const frame = astutils.J2SDataPropertyInit(
      loc, 
      astutils.J2SString(loc, "%frame"),	
      astutils.J2SUnresolvedRef(loc, "__frame"));
   
   inits.push(frame);
   
   const runattrs = astutils.J2SObjInit(loc, inits);
   const run = astutils.J2SCall(loc, hhref(loc, "RUN"), null, [runattrs]);
      	 
   const ablock = astutils.J2SBlock(
      loc, loc, exprs);
   const taghop = tagInit("hop", loc);
   const appl = astutils.J2SDataPropertyInit(
      loc, 
      astutils.J2SString(loc, "apply"),
      astutils.J2SMethod(loc, "runfun", [], ablock, self(loc)));
   const attrs = astutils.J2SObjInit(
      loc, [locInit(loc), taghop, appl]);
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
   
   const node = astutils.J2SCall(
      loc, fun, [astutils.J2SUndefined(loc)], 
      [arg]);
   return wrapSignalNames(node, signames);
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
	 return parseHHExpression.call(this, true);
      } else {
	 return { expr: astutils.J2SUndefined(loc), accessors: [], signames: [] };
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
      let signames = [];

      while (true) {
	 const t = this.consumeToken(this.ID);
	 const iloc = t.location;
	 const { expr, accessors, signames: sigs } = parseLetInit.call(this, iloc);
	 const decl = astutils.J2SDeclInitScope(iloc, t.value, 
	    astutils.J2SUndefined(loc), 
	    "letblock", "let-opt");
	 const init = initVar(t, expr, accessors);
	 
	 inits.push(init);
	 decls.push(decl);
	 signames = signames.concat(sigs);
	 
	 switch (this.peekToken().type) {
	    case this.SEMICOLON:
	       this.consumeAny();
	       return { decls, inits, accessors, signames };
	       
	    case this.COMMA:
	       this.consumeAny();
	       break;
	       
	    default:
	       throw tokenTypeError(this.consumeAny());
	 }
      }
   }

   const { decls, inits, signames } = parseDecls.call(this);
   const stmts = inits.concat(parseHHBlock.call(this, false));
   const attrs = astutils.J2SObjInit(loc, [locInit(loc)]);
   const seqattrs = astutils.J2SObjInit(loc, 
      [locInit(loc), tagInit("let", loc)]);
   const stmt = astutils.J2SCall(loc, hhref(loc, "SEQUENCE"), null, 
      [seqattrs].concat(stmts));
   const ret = astutils.J2SReturn(loc, stmt);
   const block = astutils.J2SLetBlock(loc, loc, decls, [ret]);
   const fun = astutils.J2SMethod(loc, "letfun", [], block, self(loc));
				
   const node = astutils.J2SCall(loc, fun, [astutils.J2SUndefined(loc)], []);
   return wrapSignalNames(node, signames);
}

/*---------------------------------------------------------------------*/
/*    parseSiglAttr ...                                                */
/*---------------------------------------------------------------------*/
function parseSigAttr(loc, name, init, axs, dir) {
   const id = astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString(loc, "name"),
      name);
   const inits = dir ? [locInit(loc), dir, id] : [locInit(loc), id];
   let init_func = false;

   if (init) {
      init_func = astutils.J2SMethod(
	 loc, "initfunc", [],
	 astutils.J2SBlock(
	    loc, loc,
	    [astutils.J2SReturn(loc, init)]),
	 self(loc));
      const initfunc_prop = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "init_func"),
	 init_func);

      inits.push(initfunc_prop);
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
   
   if (isIdToken(this, this.peekToken(), "transient")) {
      let reinit_func = init_func;

      if (!reinit_func) {
	 reinit_func = astutils.J2SMethod(
	    loc, "reinitfunc", [],
	    astutils.J2SBlock(
	       loc, loc,
	       [astutils.J2SReturn(loc, astutils.J2SUndefined(loc))]),
	    self(loc));
      }
      this.consumeAny();

      const reinitfunc_prop = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString(loc, "reinit_func"),
	 reinit_func);

      inits.push(reinitfunc_prop);
   }

   const attrs = astutils.J2SObjInit(loc, inits);
   
   return astutils.J2SCall(loc, hhref(loc, "SIGNAL"), null,
			   [attrs].concat(axs));
}

/*---------------------------------------------------------------------*/
/*    parseSignal ...                                                  */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | { signal id [= val]; ... }                                  */
/*       | { signal implements intf, ; ... }                           */
/*---------------------------------------------------------------------*/
function parseSignal(token) {
   const loc = token.location;
   let signames = [];

   function parseSiglist() {
      let args = [];

      while (true) {
	 const sigloc = this.peekToken().location;
	 const sigstring = this.peekToken().value;
	 let signame = parseDollarIdentName.call(this);

	 if (sigstring === "implements") {
	    args = args.concat(parseInterfaceIntflist.call(this));
	 } else {
	    if (this.peekToken().type === this.EGAL) {
	       this.consumeAny();
	       const { expr, accessors, signames: sigs } =
		  parseHHExpression.call(this, true);
	       signames = signames.concat(sigs);
	       args.push(parseSigAttr.call(this, sigloc, signame, expr, accessors, undefined));
	    } else {
	       args.push(parseSigAttr.call(this, sigloc, signame, false, [], undefined));
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

   const tag = tagInit("LOCAL", loc);
   const attrs = astutils.J2SObjInit(loc, [locInit(loc), tag]);
   const args = parseSiglist.call(this);
   const stmts = parseHHBlock.call(this, false);

   const node = astutils.J2SCall(loc, hhref(loc, "LOCAL"), 
				 null,
				 [attrs].concat(args, stmts));
   return wrapSignalNames(node, signames);
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
	locInit(loc), tagInit("TRAP", loc)]);
   
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
	    case "pragma":
	    case "host":
	    case "hop":
	       return parsePragma.call(this, next);
	    case "module":
	       return parseModule.call(this, next, declaration, "MODULE");
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
	       return parseAsync.call(this, next);
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
	 
      case this.DOLLAR: 
	 return parseDollarStatement.call(this, next);

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

   function isInterfacep(next) {
      return (next.type === this.ID && next.value === "interface")
	 || (next.type === this.INTERFACE);
   }

   const next = this.peekToken();

   if (next.type === this.ID && next.value === "module") {
      this.consumeAny();
      return wrapVarDecl(parseModule.call(this, next, declaration, "MODULE"));
   } else if (isInterfacep.call(this, next)) {
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
   const cwd = process.cwd();
   let hhmod = hhmodulePath;
   
   if (hhmodulePath.indexOf(cwd) === 0) {
      const i = hhmodulePath.indexOf("@hop");
      hhmod = hhmodulePath.substring(i);
   }
   return astutils.J2SImport(loc, hhmod, [nm]);
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
export function script(attrs) {
   if (attrs.type !== "module") {
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
//parser.addPlugin("@hop/hiphop", parseHiphop);
parser.addPlugin("hiphop", parseHiphop);

export const parse = parser.parse.bind(parser);
export const parseString = parser.parseString.bind(parser);

