/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/preprocessor/astutils.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 17:58:05 2018                          */
/*    Last change :  Fri Jun 14 14:17:26 2024 (serrano)                */
/*    Copyright   :  2018-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Utility functions for building the js2scheme AST.                */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
import { ast } from "@hop/hopc";

/*---------------------------------------------------------------------*/
/*    global variables                                                 */
/*---------------------------------------------------------------------*/
let declKey = 10000;
const configUtype = true;
const configCtype = true;

/*---------------------------------------------------------------------*/
/*    J2SNull ...                                                      */
/*---------------------------------------------------------------------*/
export function J2SNull(loc) {
   return new ast.J2SNull(loc, 
      Symbol("null") /* type */, 
      null /* hint */, 
      false /* range */);
}

/*---------------------------------------------------------------------*/
/*    J2SUndefined ...                                                 */
/*---------------------------------------------------------------------*/
export function J2SUndefined(loc) {
   return new ast.J2SUndefined(loc, 
      Symbol("undefined") /* type */,
      null /* hint */, 
      false /* range */);
}

/*---------------------------------------------------------------------*/
/*    J2SString ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SString(loc, str) {
   return new ast.J2SString(loc, 
      Symbol("string") /* type */, 
      null /* hint */,
      false /* range */, 
      str  /* val */,
      null /* escape */,
      false /* private */);
}

/*---------------------------------------------------------------------*/
/*    J2SNumber ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SNumber(loc, num) {
   return new ast.J2SNumber(loc, 
      Symbol("unknown") /* type */, 
      null /* hint */,
      false /* range */, 
      num);
}

/*---------------------------------------------------------------------*/
/*    J2SBool ...                                                      */
/*---------------------------------------------------------------------*/
export function J2SBool(loc, bool) {
   return new ast.J2SBool(loc, 
      Symbol("bool") /* type */, 
      null /* hint */,
      false /* range */, 
      bool);
}

/*---------------------------------------------------------------------*/
/*    J2SRef ...                                                       */
/*---------------------------------------------------------------------*/
export function J2SRef(loc, decl) {
   return new ast.J2SRef(loc, 
      Symbol("any") /* type */, 
      null /* hint */,
      undefined /* range */, 
      decl);
}

/*---------------------------------------------------------------------*/
/*    J2SUnresolvedRef ...                                             */
/*---------------------------------------------------------------------*/
export function J2SUnresolvedRef(loc, id) {
   return new ast.J2SUnresolvedRef(loc, 
      Symbol("any") /* type */, 
      null /* hint */,
      undefined /* range */, 
      false /* cache */,
      id);
}

/*---------------------------------------------------------------------*/
/*    J2SHopRef ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SHopRef(loc, id) {
   return new ast.J2SHopRef(loc, 
      Symbol("any") /* type */, 
      null /* hint */,
      undefined /* range */, 
      id,
      Symbol("any") /* rtype */, 
      false /* module */);
}

/*---------------------------------------------------------------------*/
/*    J2SThis ...                                                      */
/*---------------------------------------------------------------------*/
export function J2SThis(loc, decl) {
   return new ast.J2SThis(loc, 
      Symbol("any") /* type */, 
      null /* hint */,
      undefined /* range */, 
      decl /* decl */);
}

/*---------------------------------------------------------------------*/
/*    J2SAccess ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SAccess(loc, obj, field) {
   return new ast.J2SAccess(loc, 
      Symbol("any") /*type */, 
      null /* hint */, 
      false /* range */, 
      obj /* obj */,  
      field /* field */);
}

/*---------------------------------------------------------------------*/
/*    J2SCall ...                                                      */
/*---------------------------------------------------------------------*/
export function J2SCall(loc, fun, thisarg, args) {
   return new ast.J2SCall(loc, 
      Symbol("any") /* type */, 
      null /* hint */,
      undefined /* range */, 
      -1 /* profid */,
      fun /* fun */, 
      "direct" /* protocol */,
      thisarg, 
      args);
}

/*---------------------------------------------------------------------*/
/*    J2SBinary ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SBinary(loc, op, lhs, rhs) {
   return new ast.J2SBinary(loc, 
      Symbol("unknown") /* type */,
      null /* hint */,
      undefined /* range */, 
      Symbol(op) /* op */, 
      lhs /* lhs */,
      rhs); /* rhs */
}

/*---------------------------------------------------------------------*/
/*    J2SCond ...                                                      */
/*---------------------------------------------------------------------*/
export function J2SCond(loc, test, then, otherwise) {
   return new ast.J2SCond(loc, 
      Symbol("unknown"),
      null /* hint */,
      undefined /* range */, 
      test /* test */, 
      then, /* then */
      otherwise); /* else */
}

/*---------------------------------------------------------------------*/
/*    J2SObjInit ...                                                   */
/*---------------------------------------------------------------------*/
export function J2SObjInit(loc, inits) {
   return new ast.J2SObjInit(loc, 
      Symbol("object") /* type */, 
      null /* hint */,
      undefined /* range */, 
      inits /* inits */, 
      false /* cmap */,
      false /* ronly */);
}

/*---------------------------------------------------------------------*/
/*    J2SDataPropertyInit ...                                          */
/*---------------------------------------------------------------------*/
export function J2SDataPropertyInit(loc, name, val) {
   return new ast.J2SDataPropertyInit(loc, 
      name, 
      val);
}

/*---------------------------------------------------------------------*/
/*    J2SPragma ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SPragma(loc, lang, vars, vals, expr) {
   return new ast.J2SPragma(loc, 
      Symbol("any") /* type */, 
      null /* hint */,
      undefined /* range */,
      lang, 
      vars, 
      vals, 
      expr);
}

/*---------------------------------------------------------------------*/
/*    J2SFun ...                                                       */
/*---------------------------------------------------------------------*/
export function J2SFun(loc, name, params, body) {
   if (configUtype) { 
      return new ast.J2SFun(loc, 
      	 Symbol("unknown") /* type */, 
      	 null /* hint */,
      	 undefined /* range */, 
      	 Symbol("unknown") /* rtype */,
      	 Symbol("unknown") /* rutype */,
      	 undefined /* rrange */, 
      	 "this" /* idthis */,
      	 false /* idgen */, 
      	 "normal" /* mode */,
      	 false /* decl */, 
      	 false /* need_bind_exit_return */,
      	 "no" /* new-target */,
      	 false /* vararg */, 
      	 name /* name */,
      	 false /* generator */, 
      	 true /* optimize */,
      	 false /* thisp */, 
      	 false /* argumentsp */,
      	 params, /* params */
      	 3 /* constrsize */, 
      	 false /* src */,
      	 false /* _method */, 
      	 false /* ismethodof */,
      	 body);
   } else {
      return new ast.J2SFun(loc, 
      	 Symbol("unknown") /* type */, 
      	 null /* hint */,
      	 undefined /* range */, 
      	 Symbol("unknown") /* rtype */,
      	 undefined /* rrange */, 
      	 "this" /* idthis */,
      	 false /* idgen */, 
      	 "normal" /* mode */,
      	 false /* decl */, 
      	 false /* need_bind_exit_return */,
      	 false /* new-target */,
      	 false /* vararg */, 
      	 name /* name */,
      	 false /* generator */, 
      	 true /* optimize */,
      	 false /* thisp */, 
      	 false /* argumentsp */,
      	 params, /* params */
      	 3 /* constrsize */, 
      	 false /* src */,
      	 false /* _method */, 
      	 false /* ismethodof */,
      	 body);
   }
}

/*---------------------------------------------------------------------*/
/*    J2SArrow ...                                                     */
/*---------------------------------------------------------------------*/
export function J2SArrow(loc, name, params, body) {
   if (configUtype) { 
      return new ast.J2SArrow(loc, 
      	 Symbol("unknown") /* type */, 
      	 null /* hint */,
      	 undefined /* range */, 
      	 Symbol("unknown") /* rtype */,
      	 Symbol("unknown") /* rutype */,
      	 undefined /* rrange */, 
      	 "this" /* idthis */,
      	 false /* idgen */, 
      	 "normal" /* mode */,
      	 false /* decl */, 
      	 false /* need_bind_exit_return */,
      	 "no" /* new-target */,
      	 false /* vararg */, 
      	 name /* name */,
      	 false /* generator */, 
      	 true /* optimize */,
      	 false /* thisp */, 
      	 false /* argumentsp */,
      	 params, /* params */
      	 3 /* constrsize */, 
      	 false /* src */,
      	 false /* _method */, 
      	 false /* ismethodof */,
      	 body);
   } else {
      return new ast.J2SArrow(loc, 
      	 Symbol("unknown") /* type */, 
      	 null /* hint */,
      	 undefined /* range */, 
      	 Symbol("unknown") /* rtype */,
      	 undefined /* rrange */, 
      	 "this" /* idthis */,
      	 false /* idgen */, 
      	 "normal" /* mode */,
      	 false /* decl */, 
      	 false /* need_bind_exit_return */,
      	 false /* new-target */,
      	 false /* vararg */, 
      	 name /* name */,
      	 false /* generator */, 
      	 true /* optimize */,
      	 false /* thisp */, 
      	 false /* argumentsp */,
      	 params, /* params */
      	 3 /* constrsize */, 
      	 false /* src */,
      	 false /* _method */, 
      	 false /* ismethodof */,
      	 body);
   }
}

/*---------------------------------------------------------------------*/
/*    J2SMethod ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SMethod(loc, name, params, body, self) {
   if (configUtype) { 
      return new ast.J2SFun(loc, 
      	 Symbol("unknown") /* type */, 
      	 null /* hint */,
      	 undefined /* range */, 
      	 Symbol("unknown") /* rtype */,
      	 Symbol("unknown") /* rutype */,
      	 undefined /* rrange */, 
      	 "this" /* idthis */,
      	 false /* idgen */, 
      	 "normal" /* mode */,
      	 false /* decl */, 
      	 false /* need_bind_exit_return */,
      	 "no" /* new-target */,
      	 false /* vararg */, 
      	 name /* name */,
      	 false /* generator */, 
      	 true /* optimize */,
      	 self /* thisp */, 
      	 false /* argumentsp */,
      	 params /* params */,
      	 3 /* constrsize */, 
      	 false /* src */,
      	 false /* _method */, 
      	 false /* ismethodof */,
      	 body);
   } else {
      return new ast.J2SFun(loc, 
      	 Symbol("unknown") /* type */, 
      	 null /* hint */,
      	 undefined /* range */, 
      	 Symbol("unknown") /* rtype */,
      	 undefined /* rrange */, 
      	 "this" /* idthis */,
      	 false /* idgen */, 
      	 "normal" /* mode */,
      	 false /* decl */, 
      	 false /* need_bind_exit_return */,
      	 false /* new-target */,
      	 false /* vararg */, 
      	 name /* name */,
      	 false /* generator */, 
      	 true /* optimize */,
      	 self /* thisp */, 
      	 false /* argumentsp */,
      	 params /* params */,
      	 3 /* constrsize */, 
      	 false /* src */,
      	 false /* _method */, 
      	 false /* ismethodof */,
      	 body);
   }
}

/*---------------------------------------------------------------------*/
/*    J2SBlock ...                                                     */
/*---------------------------------------------------------------------*/
export function J2SBlock(loc, endloc, nodes) {
   return new ast.J2SBlock(loc, 
      nodes, endloc);
}

/*---------------------------------------------------------------------*/
/*    J2SStmtExpr ...                                                  */
/*---------------------------------------------------------------------*/
export function J2SStmtExpr(loc, expr) {
   return new ast.J2SStmtExpr(loc, 
      expr);
}

/*---------------------------------------------------------------------*/
/*    J2SSeq ...                                                       */
/*---------------------------------------------------------------------*/
export function J2SSeq(loc, nodes) {
   return new ast.J2SSeq(loc, 
      nodes);
}

/*---------------------------------------------------------------------*/
/*    J2SBindExit ...                                                  */
/*---------------------------------------------------------------------*/
export function J2SBindExit(loc, lbl, stmt) {
   return new ast.J2SBindExit(loc, 
      Symbol("object") /* type */, 
      null /* hint */,
      undefined /* range */, 
      lbl /* from */, 
      Symbol("unknown") /* utype */, 
      stmt);
}

/*---------------------------------------------------------------------*/
/*    J2SReturn ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SReturn(loc, expr) {
   return new ast.J2SReturn(loc, 
      false /* exit */, 
      true /* tail */,
      undefined /* from */, 
      expr);
}

/*---------------------------------------------------------------------*/
/*    J2SDecl ...                                                      */
/*---------------------------------------------------------------------*/
export function J2SDecl(loc, id, binder = "let", _scmid = false) {
   if (configCtype) { 
      return new ast.J2SDecl(loc, 
      	 id /* id */, 
      	 _scmid /* _scmid */, 
      	 declKey++ /* key */,
      	 binder != "const" /* writable */,
      	 "local" /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 binder == "const" ? "let" : binder /* binder */,
      	 Symbol("any") /* ctype */, 
      	 Symbol("any") /* utype */, 
      	 Symbol("any") /* itype */,
      	 Symbol("any") /* vtype */, 
      	 Symbol("any") /* mtype */, 
      	 undefined /* irange */,
      	 undefined /* vrange */, 
      	 null /* hint */,
         false /* export */,
         false /* optional */);
   } else if (configUtype) { 
      return new ast.J2SDecl(loc, 
      	 id /* id */, 
      	 _scmid /* _scmid */, 
      	 declKey++ /* key */,
      	 binder != "const" /* writable */,
      	 "local" /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 binder == "const" ? "let" : binder /* binder */,
      	 Symbol("any") /* utype */, 
      	 Symbol("any") /* itype */,
      	 Symbol("any") /* vtype */, 
      	 Symbol("any") /* mtype */, 
      	 undefined /* irange */,
      	 undefined /* vrange */, 
      	 null /* hint */,
      	 false /* export */);
   } else {
      return new ast.J2SDecl(loc, 
      	 id /* id */, 
      	 _scmid /* _scmid */, 
      	 declKey++ /* key */,
      	 binder != "const" /* writable */,
      	 "local" /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 binder == "const" ? "let" : binder /* binder */,
      	 Symbol("any") /* utype */, 
      	 Symbol("any") /* itype */,
      	 Symbol("any") /* vtype */, 
      	 undefined /* irange */,
      	 undefined /* vrange */, 
      	 null /* hint */,
      	 false /* export */);
   }
}

/*---------------------------------------------------------------------*/
/*    J2SDeclParam ...                                                 */
/*---------------------------------------------------------------------*/
export function J2SDeclParam(loc, id, utype) {
   if (configCtype) { 
      return new ast.J2SDecl(loc, 
      	 id /* id */, 
      	 false /* _scmid */, 
      	 declKey++ /* key */,
      	 true /* writable */,
      	 "local" /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 "param" /* binder */,
      	 Symbol(utype) /* ctype */, 
      	 Symbol(utype) /* utype */, 
      	 Symbol(utype) /* itype */,
      	 Symbol(utype) /* vtype */, 
      	 Symbol(utype) /* mtype */, 
      	 undefined /* irange */,
      	 undefined /* vrange */, 
      	 null /* hint */,
         false /* export */,
         false /* optional */);
   } else if (configUtype) { 
      return new ast.J2SDecl(loc, 
      	 id /* id */, 
      	 false /* _scmid */, 
      	 declKey++ /* key */,
      	 true /* writable */,
      	 "local" /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 "param" /* binder */,
      	 Symbol(utype) /* utype */, 
      	 Symbol(utype) /* itype */,
      	 Symbol(utype) /* vtype */, 
      	 Symbol(utype) /* mtype */, 
      	 undefined /* irange */,
      	 undefined /* vrange */, 
      	 null /* hint */,
      	 false /* export */);
   } else {
      return new ast.J2SDecl(loc, 
      	 id /* id */, 
      	 false /* _scmid */, 
      	 declKey++ /* key */,
      	 true /* writable */,
      	 "local" /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 "param" /* binder */,
      	 Symbol(utype) /* itype */,
      	 Symbol(utype) /* vtype */, 
      	 Symbol(utype) /* mtype */, 
      	 undefined /* irange */,
      	 undefined /* vrange */, 
      	 null /* hint */,
      	 false /* export */);
   }
}

/*---------------------------------------------------------------------*/
/*    J2SDeclInitScope ...                                             */
/*---------------------------------------------------------------------*/
export function J2SDeclInitScope(loc, id, val, scope, binder = "let", ronly) {
   if (configCtype) { 
      return new ast.J2SDeclInit(loc, 
      	 id, 
      	 false /* _scmid */, 
      	 declKey++ /* key */,
      	 !ronly /* writable */, 
      	 scope /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 binder /* binder */, 
      	 Symbol("any") /* ctype */,
      	 Symbol("any") /* utype */,
      	 Symbol("any") /* itype */, 
      	 Symbol("any") /* vtype */,
      	 Symbol("any") /* mtype */,
      	 undefined /* irange */, 
      	 undefined /* vrange */,
      	 null /* hint */, 
      	 false /* export */, 
         false /* optional */,
      	 val);
   } else if (configUtype) { 
      return new ast.J2SDeclInit(loc, 
      	 id, 
      	 false /* _scmid */, 
      	 declKey++ /* key */,
      	 !ronly /* writable */, 
      	 scope /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 binder /* binder */, 
      	 Symbol("any") /* utype */,
      	 Symbol("any") /* itype */, 
      	 Symbol("any") /* vtype */,
      	 Symbol("any") /* mtype */,
      	 undefined /* irange */, 
      	 undefined /* vrange */,
      	 null /* hint */, 
      	 false /* export */, 
      	 val);
   } else {
      return new ast.J2SDeclInit(loc, 
      	 id, 
      	 false /* _scmid */, 
      	 declKey++ /* key */,
      	 !ronly /* writable */, 
      	 scope /* scope */,
      	 0 /* usecnt */, 
      	 false /* useinloop */,
      	 true /* escape */, 
      	 null /* usage */,
      	 binder /* binder */, 
      	 Symbol("any") /* utype */,
      	 Symbol("any") /* itype */, 
      	 Symbol("any") /* vtype */,
      	 undefined /* irange */, 
      	 undefined /* vrange */,
      	 null /* hint */, 
      	 false /* export */, 
      	 val);
   }
}

/*---------------------------------------------------------------------*/
/*    J2SDeclInit ...                                                  */
/*---------------------------------------------------------------------*/
export function J2SDeclInit(loc, id, val, binder = "let", ronly) {
   return J2SDeclInitScope(loc, id, val, "local", binder, ronly);
}

/*---------------------------------------------------------------------*/
/*    J2SVarDecls ...                                                  */
/*---------------------------------------------------------------------*/
export function J2SVarDecls(loc, decls) {
   return new ast.J2SVarDecls(loc, 
      decls);
}

/*---------------------------------------------------------------------*/
/*    J2SLetBlock ...                                                  */
/*---------------------------------------------------------------------*/
export function J2SLetBlock(loc, endloc, decls, nodes, rec = false) {
   return new ast.J2SLetBlock(loc, 
      nodes /* nodes */,
      endloc /* endloc */,
      rec /* rec */,
      decls /* decls */,
      "hopscript" /* mode */);
}

/*---------------------------------------------------------------------*/
/*    J2SArray ...                                                     */
/*---------------------------------------------------------------------*/
export function J2SArray(loc, exprs) {
   return new ast.J2SArray(loc, 
      Symbol("array") /* type */, 
      null /* hint */,
      undefined /* range */,
      exprs.length /* len */, 
      exprs);
}

/*---------------------------------------------------------------------*/
/*    J2SAssig ...                                                     */
/*---------------------------------------------------------------------*/
export function J2SAssig(loc, lhs, rhs) {
   return new ast.J2SAssig(loc, 
      Symbol("any") /* type */, 
      null /* hint */,
      undefined /* range */,
      lhs, rhs);
}

/*---------------------------------------------------------------------*/
/*    J2SLiteralValue ...                                              */
/*---------------------------------------------------------------------*/
export function J2SLiteralValue(loc, val) {
   return new ast.J2SLiteralValue(loc, 
      Symbol("any") /* type */, 
      null /* hint */,
      undefined /* range */,
      val);
}

/*---------------------------------------------------------------------*/
/*    J2SImportName ...                                                */
/*---------------------------------------------------------------------*/
export function J2SImportName(loc, name, alias) {
   return new ast.J2SImportName(loc, name, alias);
}

/*---------------------------------------------------------------------*/
/*    J2SImport ...                                                    */
/*---------------------------------------------------------------------*/
export function J2SImport(loc, path, names) {
   return new ast.J2SImport(loc, path, false, 
      new J2SUndefined(loc), 
      names, false, false);
}
