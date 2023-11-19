/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/preprocessor/_hhaccess.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Oct 25 10:36:55 2023                          */
/*    Last change :  Sun Nov 19 11:39:56 2023 (serrano)                */
/*    Copyright   :  2023 manuel serrano                               */
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
import * as hop from "@hop/hop";
import { ast, list } from "@hop/hopc";

let _hhaccess = undefined;

/*---------------------------------------------------------------------*/
/*    hhaccess ...                                                     */
/*---------------------------------------------------------------------*/
export function hhaccess(node, iscnt, hhname, accessor) {
   if (hop.engine === "hop") {
      if (!_hhaccess) {
	 _hhaccess = require("./_hhaccess.hop");
      }
   } else {
      if (!_hhaccess) {
	 _hhaccess = hhaccessNode;
      }
   }
   return _hhaccess(node, iscnt, hhname, accessor);
}

/*---------------------------------------------------------------------*/
/*    hhaccessNode ...                                                 */
/*---------------------------------------------------------------------*/
function hhaccessNode(node, iscnt, hhname, accessors) {
   const venv = collectVars(node);
   const lenv = collectLets(list.list(node));
   const axs = collectAxs(node, venv.concat(lenv));

   if (axs.length === 0) {
      return node;
   } else if (node instanceof ast.J2SExpr) {
      const loc = node.loc;
      const ret = new ast.J2SReturn({loc: loc, expr: node});
      const stmt = nodeAccessors(ret, axs, iscnt, hhname, accessors);
      const be = new ast.J2SBindExit({loc: loc, lbl: false, stmt: stmt});
      ret.from = be;

      return be;
   } else {
      return nodeAccessors(node, axs, iscnt, hhname, accessors);
   }
}

/*---------------------------------------------------------------------*/
/*    nodeAccessors ...                                                */
/*---------------------------------------------------------------------*/
function nodeAccessors(node, axs, iscnt, hhname, accessors) {
   
   function thisAccessor(loc, field) {
      const ref = new ast.J2SUnresolvedRef({loc: loc, id: "this"});
      return new ast.J2Access({loc: loc, obj: ref, field: field});
   }

   function sigaccess(loc, name, pre, val) {
      const inits = list.list(
	 new ast.J2SDataPropertyInit(
	    {loc: loc,
	     name: new ast.J2SString({loc: loc, val: "signame"}),
	     val: new ast.J2SString({loc: loc, val: name})}),
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

   function accessor(loc, obj, field) {
      const id = obj.id;
      switch (field.val) {
	 case "signame":
	    return sigaccess(loc, id, false, false);
	 case "now":
	    return sigaccess(loc, id, false, false);
	 case "nowval":
	    return sigaccess(loc, id, false, true);
	 case "pre":
	    return sigaccess(loc, id, true, false);
	 case "preval":
	    return sigaccess(loc, id, true, true);
      }
   }

   function accessGeneralDecl(ax) {
      const loc = ax.loc;
      const obj = ax.obj;
      const field = ax.field;

      accessors.push(accessor(loc, obj, field));

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

   function deleteDuplicates(v) {
      const res = [];
      for (let i = v.length - 1; i >=0; i--) {
	 const id = v[i].obj.id;
	 const j = v.findIndex(a => a.obj.id === id);
	 if (i ===j) res.push(v[i]);
      }
      return res;
   }
   const loc = node.loc;

   if (axs.length > 0) {
      return new ast.J2SLetBlock(
	 {loc: loc,
	  endloc: loc,
	  rec: false,
	  decls: list.array2list(deleteDuplicates(axs).map(accessGeneralDecl)),
	  mode: "hopscript",
	  nodes: list.list(node)});
   } else {
      return new ast.J2SBlock({loc: loc, endloc: loc, nodes: list.list(node)});
   }
}

/*---------------------------------------------------------------------*/
/*    collectLets ...                                                  */
/*---------------------------------------------------------------------*/
function collectLets(nodes) {
   const arrays = list.map(d => {
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
   }, nodes);

   return Array.prototype.concat.apply([], list.list2array(arrays));
}

/*---------------------------------------------------------------------*/
/*    collectAxs ...                                                   */
/*---------------------------------------------------------------------*/
function collectAxs(node, env) {
   if (node instanceof ast.J2SNode) {
      return node.collectAxs(env);
   } else if (list.pairp(node)) {
      return list.list2array(list.map(n => collectAxs(n, env), node));
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
      res = res.concat(collectAxs(this[k], env), res);
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
   const axobj = collectAxs(obj, env);
   const axfd = collectAxs(field, env);

   if (obj instanceof ast.J2SUnresolvedRef
      && field instanceof ast.J2SString
      && !findDecl(obj, env)) {
      const id = obj.id;
      const val = field.val;

      if (val === "signame"
	 || val === "now" || val === "nowval"
	 || val === "pre" || val === "preval"
	 && reserved.indexOf(id) < 0) {
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
   const env0 = ast.j2sfunExpressionp(this) ? [decl].concat(env) : env;
   const decls = collectVars(this.body);
   const envl = decls.concat(this.params, env0);
   const ldecls = collectLets(this.body.nodes);
   const args = new ast.J2SDecl({id: "arguments", utype: "any", loc: this.loc});
   const nenv = [args].concat(ldecls, envl);
   const bdenv = this.thisp instanceof ast.J2SDecl ? [this.thisp].contact(env) : env;
   nwenv = [].contact(this.decls, this.params, bdenv);
   return collectAxs(this.body, nwenv);
}

/*---------------------------------------------------------------------*/
/*    collectVars ...                                                  */
/*---------------------------------------------------------------------*/
function collectVars(node) {
   if (node instanceof ast.J2SNode) {
      return node.collectVars();
   } else if (list.pairp(node)) {
      return list.list2array(list.map(collectVars, node));
   } else {
      return [];
   }
}

/*---------------------------------------------------------------------*/
/*    ast.J2SNode.collectVars ...                                      */
/*---------------------------------------------------------------------*/
ast.J2SNode.prototype.collectVars = function() {
   let res = [];

   for(let k in this) {
      res = res.concat(collectVars(this[k]), res);
   }

   return res;
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
   return ast.j2sVarp(d) ? [ this ] : [];
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
