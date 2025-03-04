/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/preprocessor/hhaccess.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Oct 25 10:36:55 2023                          */
/*    Last change :  Mon Mar  3 14:08:20 2025 (serrano)                */
/*    Copyright   :  2023-25 manuel serrano                            */
/*    -------------------------------------------------------------    */
/*    This is the version used by the nodejs port (see _hhaccess.hop)  */
/*    -------------------------------------------------------------    */
/*    Patching the AST built by the Hop parser.                        */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
import { ast, list } from "@hop/hopc";

/*---------------------------------------------------------------------*/
/*    reservedFields ...                                               */
/*---------------------------------------------------------------------*/
const reservedFields = new Map();

["clazz", "loc", "endloc", "type", "duplicate", "generate", "profid",
 "protocol", "range", "hint", "cache", "ronly", "cmap", "utype", "lbl",
 "mode", "id", "rec", "op"]
   .forEach(k => reservedFields.set(k, true));

/*---------------------------------------------------------------------*/
/*    gensym ...                                                       */
/*---------------------------------------------------------------------*/
let gensym = 0;

/*---------------------------------------------------------------------*/
/*    hhaccess ...                                                     */
/*---------------------------------------------------------------------*/
export function hhaccess(n, iscnt, hhname, accessors) {
   const node = (ast.isNative && ast.isNative(n)) ? ast.wrap(n) : n;
   const venv = collectVars(node);
   const lenv = collectLets(list.list(node));
   const axs = collectAxs(node, venv.concat(lenv));
   const signames = accessorsSigname(axs);

   if (axs.length === 0) {
      return { expr: node, signames };
   } else if (node instanceof ast.J2SExpr) {
      const loc = node.loc;
      const ret = new ast.J2SReturn({loc: loc, expr: node});
      const stmt = nodeAccessors(ret, axs, iscnt, hhname, accessors);
      const expr = new ast.J2SBindExit({loc: loc, lbl: false, stmt: stmt});
      ret.from = expr;

      return { expr, signames };
   } else {
      const expr = nodeAccessors(node, axs, iscnt, hhname, accessors);
      return { expr, signames };
   }
}

/*---------------------------------------------------------------------*/
/*    accessorsSigname ...                                             */
/*    -------------------------------------------------------------    */
/*    Returns the list of dynamic signal names (i.e., those            */
/*    using the this[expr] form) and modify the the accessors          */
/*    to prepare the variable bindings.                                */
/*---------------------------------------------------------------------*/
function accessorsSigname(axs) {
   return axs.map(ax => {
      if (ax.obj instanceof ast.J2SAccess) {
	 const id = "g" + (ax.loc?.offset || gensym++);
	 const field = ax.obj.field;
	 ax.obj.field = new ast.J2SUnresolvedRef({loc: ax.loc, id: id});
	 return { id, field }
      } else {
	 return false;
      }
   }).filter(n => n);
}

/*---------------------------------------------------------------------*/
/*    machineSignals ...                                               */
/*---------------------------------------------------------------------*/
function machineSignals(loc) {
   const ref = new ast.J2SUnresolvedRef({loc: loc, id: "this"});
   const field = new ast.J2SString({loc: loc, val: "signals"});
   return new ast.J2SAccess({loc: loc, obj: ref, field: field});
}
   
/*---------------------------------------------------------------------*/
/*    nodeAccessors ...                                                */
/*---------------------------------------------------------------------*/
function nodeAccessors(node, axs, iscnt, hhname, accessors) {
   
   function thisAccessor(loc, field) {
      //const ref = new ast.J2SUnresolvedRef({loc: loc, id: "thus"});
      const ref = machineSignals(loc);
      return new ast.J2Access({loc: loc, obj: ref, field: field});
   }

   function sigaccess(loc, name, pre, val) {
      const inits = list.list(
	 new ast.J2SDataPropertyInit(
	    {loc: loc,
	     name: new ast.J2SString({loc: loc, val: "signame"}),
	     val: name}),
	 new ast.J2SDataPropertyInit(
	    {loc: loc,
	     name: new ast.J2SString({loc: loc, val: "pre"}),
	     val: new ast.J2SBool({loc: loc, val: pre})}),
	 new ast.J2SDataPropertyInit(
	    {loc: loc,
	     name: new ast.J2SString({loc: loc, val: "val"}),
	     val: new ast.J2SBool({loc: loc, val: val})}),
	 new ast.J2SDataPropertyInit(
	    {loc: loc,
	     name: new ast.J2SString({loc: loc, val: "cnt"}),
	     val: new ast.J2SBool({loc: loc, val: iscnt})}));
      const attr = new ast.J2SObjInit({loc: loc, inits: inits});
      const hh = new ast.J2SUnresolvedRef({loc: loc, id: "$$hiphop"});
      const field = new ast.J2SString({loc: loc, val: "SIGACCESS"});
      const fun = new ast.J2SAccess({loc: loc, obj: hh, field: field});

      return new ast.J2SCall({loc: loc,
			       thisargs: null,
			       fun: fun,
			       args: list.list(attr)});
   }

   function accessor(loc, axs, obj, field) {
      if (obj instanceof ast.J2SUnresolvedRef) {
	 const name = new ast.J2SString({loc: loc, val: obj.id});
	 const fname = field.val;
	 return sigaccess(loc, name,
			  fname === "pre" || fname === "preval",
			  fname === "preval" || fname === "nowval");
      } else {
	 const name = obj.field;

	 switch (field.val) {
	    case "signame":
	       return sigaccess(loc, name, false, false);
	    case "now":
	       return sigaccess(loc, name, false, false);
	    case "nowval":
	       return sigaccess(loc, name, false, true);
	    case "pre":
	       return sigaccess(loc, name, true, false);
	    case "preval":
	       return sigaccess(loc, name, true, true);
	 }
      }
   }

   function accessGeneralDecl(ax) {
      const loc = ax.loc;
      const obj = ax.obj;

      if (obj instanceof ast.J2SUnresolvedRef) {
	 const id = obj.id;
	 return new ast.J2SDeclInit(
	    {loc: loc,
	     id: id,
	     writable: false,
	     vtype: "any",
	     binder: "let-opt",
	     scopt: "letblock",
	     val: new ast.J2SAccess(
		{loc: loc,
		 obj: new ast.J2SUnresolvedRef({loc: loc, id: "this"}),
		 field: new ast.J2SString({loc: loc, val: id})})});
      }
   }

   function deleteDuplicates(v) {
      const res = [];
      for (let i = v.length - 1; i >= 0; i--) {
	 if (v[i].obj instanceof ast.J2SUnresolvedRef) {
	    const id = v[i].obj.id;
	    const j = v.findIndex(a => a.obj.id === id);
	    if (i === j) res.push(v[i]);
	 } else {
	    res.push(v[i]);
	 }
      }
      return res;
   }
   const loc = node.loc;

   if (axs.length > 0) {

      axs.forEach(ax => {
	 const loc = ax.loc;
	 const obj = ax.obj;
	 const field = ax.field;

	 accessors.push(accessor(loc, ax, obj, field));
      });
      
      return new ast.J2SLetBlock(
	 {loc: loc,
	  endloc: loc,
	  rec: false,
	  decls: list.array2list(deleteDuplicates(axs)
	     .map(ax => accessGeneralDecl(ax))
	     .filter(a => a)),
	  mode: "hopscript",
	  nodes: list.list(node)});
   } else {
      return new ast.J2SBlock({loc: loc, endloc: loc, nodes: list.list(node)});
   }
}

/*---------------------------------------------------------------------*/
/*    collectLets ...                                                  */
/*---------------------------------------------------------------------*/
function collectLets(node) {
   
   function nodeCollectLets(d) {
      if (d instanceof ast.J2SVarDecls) {
	 const p = d => {
	    if (ast.j2sLetp(d)) {
	       if (d.scope !== "loop") {
		  return d;
	       } else {
		  return false;
	       }
	    } else {
	       return false;
	    }
	 };

	 return list.list2array(list.filter(p, d.decls));
      } else {
	 return [];
      }
   }
   
   if (node instanceof ast.J2SNode) {
      return [ nodeCollectLets(node ) ];
   } else if (list.pairp(node)) {
      const arrays = list.map(nodeCollectLets, node);
      return Array.prototype.concat.apply([], list.list2array(arrays));
   } else {
      return [];
   }
}

/*---------------------------------------------------------------------*/
/*    collectAxs ...                                                   */
/*---------------------------------------------------------------------*/
function collectAxs(node, env) {
   if (node instanceof ast.J2SNode) {
      return node.collectAxs(env);
   } else if (list.pairp(node)) {
      return list.list2array(node).flatMap(n => collectAxs(n, env));
   } else if (Array.isArray(node)) {
      return node.flatMap(n => collectAxs(n, env));
   } else {
      return [];
   }
}

/*---------------------------------------------------------------------*/
/*    ast.J2SNode.collectAxs ...                                       */
/*---------------------------------------------------------------------*/
ast.J2SNode.prototype.collectAxs = function(env) {
   let res = [];

   for(let k in this) {
      if (!reservedFields.get(k)) {
	 res = res.concat(collectAxs(this[k], env));
      }
   }

   return res;
}

/*---------------------------------------------------------------------*/
/*    reserved                                                         */
/*---------------------------------------------------------------------*/
const reserved = [ "Date" ];

/*---------------------------------------------------------------------*/
/*    findDecl ...                                                     */
/*---------------------------------------------------------------------*/
function findDecl(ref, env) {
   return env.find(d => d.id === ref.id);
}

/*---------------------------------------------------------------------*/
/*    ast.J2SAccess.collectAxs ...                                     */
/*---------------------------------------------------------------------*/
ast.J2SAccess.prototype.collectAxs = function(env) {
   const obj = this.obj;
   const field = this.field;
   const fieldname = field instanceof ast.J2SString ? field.val : "";
   const axobj = collectAxs(obj, env);
   const axfd = collectAxs(field, env);

   if (fieldname === "signame"
      || fieldname === "now" || fieldname === "nowval"
      || fieldname === "pre" || fieldname === "preval") {
      // a direct form ident.access
      if (obj instanceof ast.J2SUnresolvedRef && !findDecl(obj, env)) {
	 const id = obj.id;

	 if (reserved.indexOf(id) < 0) {
	    return [this].concat(axobj, axfd);
	 } else {
	    return axobj.concat(axfd);
	 }
      } else if (obj instanceof ast.J2SAccess
	 && obj.obj instanceof ast.J2SUnresolvedRef
	 && obj.obj.id === "this") {
	 // a stagged form this[field].access
	 return [this].concat(axobj, axfd);
      } else {
	 return axobj.concat(axfd);
      }
   } else {
      return axobj.concat(axfd);
   }
}
   
/*---------------------------------------------------------------------*/
/*    ast.J2SFun.collectAxs ...                                        */
/*---------------------------------------------------------------------*/
ast.J2SFun.prototype.collectAxs = function(env) {
   const env0 = ast.j2sfunExpressionp(this) ? [this.decl].concat(env) : env;
   const decls = collectVars(this.body);
   const envl = decls.concat(list.list2array(this.params), env0);
   const ldecls = collectLets(this.body.nodes);
   const args = new ast.J2SDecl({id: "arguments", utype: "any", loc: this.loc});
   const nenv = [args].concat(ldecls, envl);
   const bdenv = this.thisp instanceof ast.J2SDecl ? [this.thisp].concat(nenv) : nenv;
   return collectAxs(this.body, bdenv);
}

/*---------------------------------------------------------------------*/
/*    ast.J2SReturn.collectAxs ...                                     */
/*---------------------------------------------------------------------*/
ast.J2SReturn.prototype.collectAxs = function(env) {
   if (this.expr) {
      return collectAxs(this.expr, env);
   } else {
      return [];
   }
}

/*---------------------------------------------------------------------*/
/*    collectVars ...                                                  */
/*---------------------------------------------------------------------*/
function collectVars(node) {
   if (node instanceof ast.J2SNode) {
      return node.collectVars();
   } else if (list.pairp(node)) {
      return list.list2array(node).flatMap(collectVars);
   } else {
      return [];
   }
}

/*---------------------------------------------------------------------*/
/*    ast.J2SNode.collectVars ...                                      */
/*---------------------------------------------------------------------*/
ast.J2SNode.prototype.collectVars = function() {
   let res = [];

   Object.keys(this).forEach(k => {
      if (!reservedFields.get(k)) {
	 res = res.concat(collectVars(this[k]));
      }
   });

   return res;
}

/*---------------------------------------------------------------------*/
/*    ast.J2SLiteralValue.collectVars ...                              */
/*---------------------------------------------------------------------*/
ast.J2SLiteralValue.prototype.collectVars = function() {
   return [];
}

/*---------------------------------------------------------------------*/
/*    ast.J2SDataPropertyInit.collectVars ...                          */
/*---------------------------------------------------------------------*/
ast.J2SDataPropertyInit.prototype.collectVars = function() {
   return this.val.collectVars();
}

/*---------------------------------------------------------------------*/
/*    ast.J2SVarDecls.collectVars ...                                  */
/*---------------------------------------------------------------------*/
ast.J2SVarDecls.prototype.collectVars = function() {
   
   function getDecl(d) {
      return !ast.j2sLetp(d);
   }
      
   let res = [];
   return list.list2array(list.filterMap(getDecl, this.decls));
}

/*---------------------------------------------------------------------*/
/*    ast.J2SDecl.collectVars ...                                      */
/*---------------------------------------------------------------------*/
ast.J2SDecl.prototype.collectVars = function() {
   return ast.j2sVarp(this) ? [ this ] : [];
}
   
/*---------------------------------------------------------------------*/
/*    ast.J2SDeclFun.collectVars ...                                   */
/*---------------------------------------------------------------------*/
ast.J2SDeclFun.prototype.collectVars = function() {
   return [ this ];
}
   
/*---------------------------------------------------------------------*/
/*    ast.J2SDeclExtern.collectVars ...                                */
/*---------------------------------------------------------------------*/
ast.J2SDeclExtern.prototype.collectVars = function() {
   return [ this ];
}
   
/*---------------------------------------------------------------------*/
/*    ast.J2SFun.collectVars ...                                       */
/*---------------------------------------------------------------------*/
ast.J2SFun.prototype.collectVars = function() {
   return [];
}
   
/*---------------------------------------------------------------------*/
/*    ast.J2SDollar.collectVars ...                                    */
/*---------------------------------------------------------------------*/
ast.J2SDollar.prototype.collectVars = function() {
   return [];
}

/*---------------------------------------------------------------------*/
/*    ast.J2SReturn.collectVars ...                                    */
/*---------------------------------------------------------------------*/
ast.J2SReturn.prototype.collectVars = function() {
   if (this.expr) {
      return this.expr.collectVars();
   } else {
      return [];
   }
}
