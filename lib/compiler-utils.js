/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/compiler-utils.js         */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Sun Sep 30 13:25:12 2018                          */
/*    Last change :  Sun Feb 23 17:41:08 2025 (serrano)                */
/*    Copyright   :  2018-25 Inria                                     */
/*    -------------------------------------------------------------    */
/*    Compiler utility functions                                       */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as error from "./error.js";
import * as net from "./net.js";
import * as ast from "./ast.js";

export { getKListChild, getResChildren, getSuspChildren, killListChildren };
export { InitVisitor, SignalVisitor, TrapVisitor };

/*---------------------------------------------------------------------*/
/*    getKListChild ...                                                */
/*    -------------------------------------------------------------    */
/*    Helper function that gives a list of incarnation of K[n] from a  */
/*    substatement. It takes account of possible lower incarnation     */
/*    level of the superstatement.                                     */
/*---------------------------------------------------------------------*/
function getKListChild(ast_node, type, childCircuit, k) {
   let depth1 = ast_node.depth;
   let depth2 = childCircuit.astNode.depth;
   let k_list1 = [];
   let k_list2 = childCircuit.kMatrix[k];
   if (!k_list2) {
      return k_list1;
   }

   for (let l = 0; l < k_list2.length; l++) {
      if (l <= depth1) {
	 k_list1[l] = net.makeOr(ast_node, "k" + k + "_buffer", l);
	 if (k_list2[l]) {
	    k_list2[l].connectTo(k_list1[l], net.FAN.STD);
	 }
      } else {
	 if (!k_list1[depth1]) {
	    k_list1[depth1] = net.makeOr(ast_node,
	       "k" + k + "_buffer", l);
	 }
	 k_list2[l].connectTo(k_list1[depth1], net.FAN.STD);
      }
   }

   return k_list1;
}

/*---------------------------------------------------------------------*/
/*    getResChildren ...                                               */
/*    -------------------------------------------------------------    */
/*    Helper function that gives net buffer connected to RES           */
/*    wires of children.                                               */
/*---------------------------------------------------------------------*/
function getResChildren(ast_node, type, childCircuits) {
   let res = null;

   if (childCircuits.length == 1) {
      res = childCircuits[0].res;
   } else {
      for (let i = 0; i < childCircuits.length; i++) {
      	 let res_child = childCircuits[i].res;

      	 if (res_child) {
	    if (!res) {
	       res = net.makeOr(ast_node, "buffer_res");
	    }
	    res.connectTo(res_child, net.FAN.STD);
      	 }
      }
   }
   
   return res;
}

/*---------------------------------------------------------------------*/
/*    getSuspChildren ...                                              */
/*    -------------------------------------------------------------    */
/*    Helper function that gives SUSP net buffer connected to          */
/*    SUSP wires of children                                           */
/*---------------------------------------------------------------------*/
function getSuspChildren(ast_node, type, childCircuits) {
   let susp = null;

   if (childCircuits.length == 1) {
      susp = childCircuits[0].susp;
   } else {
      for (let i = 0; i < childCircuits.length; i++) {
	 let susp_child = childCircuits[i].susp;

	 if (susp_child) {
	    if (!susp) {
	       susp = net.makeOr(ast_node, "buffer_susp");
	    }
	    susp.connectTo(susp_child, net.FAN.STD);
	 }
      }
   }

   return susp;
}

/*---------------------------------------------------------------------*/
/*    killListChildren ...                                             */
/*    -------------------------------------------------------------    */
/*    Helper function that gives KILL net list buffer connected to     */
/*    KILL list wires of children.                                     */
/*                                                                     */
/*    It gens the environment translation of KILL wires (see Esterel   */
/*    Constructire Book, page 151).                                    */
/*---------------------------------------------------------------------*/
function killListChildren(ast_node, type, childCircuits) {
   let killList = null;

   for (let c = 0; c < childCircuits.length; c++) {
      let child = childCircuits[c];
      let childDepth = child.astNode.depth;

      if (child.killList) {
	 if (!killList) {
	    killList = [];
	 }

	 for (let i = 0; i <= ast_node.depth; i++) {
	    if (!killList[i]) {
	       killList[i] = net.makeOr(ast_node, "buf_kill", i);
	    }
	    killList[i].connectTo(child.killList[i], net.FAN.STD);
	 }

	 if (childDepth > ast_node.depth) {
	    if (childDepth != ast_node.depth + 1) {
	       throw error.TypeError("killListChildren: level error", ast_node.loc);
	    }

	    killList[ast_node.depth].connectTo(child.killList[childDepth],
	       net.FAN.STD);
	 }
      }
   }

   return killList;
}

/*---------------------------------------------------------------------*/
/*    InitVisitor ...                                                  */
/*    -------------------------------------------------------------    */
/*    Visitors and functions thats decorates the AST before circuit    */
/*    translation :                                                    */
/*                                                                     */
/*       - assign machine reference to each ast node                   */
/*       - check unicity of instruction identifier (id XML field)      */
/*       - assign module_instance_id to module/run/let[in run context] */
/*         nodes                                                       */
/*                                                                     */
/*    Warning: the current implementation does not guarantee that a    */
/*    module instance identifier will be the same if branches          */
/*    containing run are added / removed between two reactions. It     */
/*    will be needed before the debuggers support that feature.        */
/*---------------------------------------------------------------------*/
// @sealed
class InitVisitor {
   machine;
   ids;
   next_module_instance_id;
   
   constructor(machine) {
      this.machine = machine;
      this.ids = [];
      this.next_module_instance_id = 0;
   }

   visit(ast_node) {
      ast_node.machine = this.machine;

      ast_node.net_list = [];

      if (ast_node.id) {
	 if (this.ids[ast_node.id]) {
	    throw error.SyntaxError(
	       `id "${ast_node.id}" must be unique`, ast_node.loc);
	 }
	 this.ids[ast_node.id] = true;
      }

      if (ast_node instanceof ast.Module) {
	 ast_node.module_instance_id = this.next_module_instance_id++;
      } else if (ast_node instanceof ast.Run) {
	 let id = this.next_module_instance_id++;
	 ast_node.module_instance_id = id;
	 ast_node.children[0].module_instance_id = id;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    SignalVisitor                                                    */
/*    -------------------------------------------------------------    */
/*    Check unicity of global signal names                             */
/*    Check unicity of local signal name for a same scope level        */
/*    Check validity of bound attribute                                */
/*                                                                     */
/*    Note that the unicity check is useless while the front-end       */
/*    language is XML : if more than one attribute is given with       */
/*    the same name, only the last will be used.                       */
/*---------------------------------------------------------------------*/
// @sealed
class SignalVisitor {
   machine;
   global_names;
   local_name_stack;
   local_frame_sz_stack;
   
   constructor(machine) {
      this.machine = machine;
      this.global_names = [];
      this.local_name_stack = [];
      this.local_frame_sz_stack = [];
   }
   
   visit(ast_node) {
      function _error_already_used(name, loc) {
	 throw error.SyntaxError(
	    `Signal name "${name}" already used.`, loc);
      }

      let instanceof_let = ast_node instanceof ast.Local;

      if (ast_node instanceof ast.Module) {
       for(let i = 0; i < ast_node.sigDeclList.length; i++) {
	    let prop = ast_node.sigDeclList[i];

	    if (this.global_names.indexOf(prop.name) > -1) {
	       _error_already_used(prop.name, ast_node.loc);
	    }
	    this.global_names.push(prop.name);
	 }
      } else if (instanceof_let) {
	 let local_names = [];

	 ast_node.sigDeclList.forEach(sigprop => {
	    if (local_names.indexOf(sigprop.name) > -1) {
	       _error_already_used(sigprop.name, ast_node.loc);
	    }
	    local_names.push(sigprop.name);

	    if (sigprop.alias) {
	       let not_found = signame =>
		   this.local_name_stack.indexOf(signame) === -1 &&
		   this.global_names.indexOf(signame) === -1;

	       if (sigprop.alias === -1) {
		  // From a RUN statement.
		  if (not_found(sigprop.name)) {
		     sigprop.alias = "";
		  } else {
		     sigprop.alias = sigprop.name;
		  }
	       } else if (not_found(sigprop.alias)) {
		  throw error.SyntaxError(
		     `Signal "${sigprop.name}" alias of unbound signal "${sigprop.alias}".`, ast_node.loc);
	       }
	    }
	 });

	 this.local_name_stack = this.local_name_stack.concat(local_names);
	 this.local_frame_sz_stack.push(local_names.length);
      }

      ast_node.children.forEach(c => c.accept(this));

      if (instanceof_let) {
	 let sz = this.local_frame_sz_stack.pop();
	 while (sz > 0) {
	    this.local_name_stack.pop();
	    sz--;
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    TrapVisitor                                                      */
/*    -------------------------------------------------------------    */
/*    Resolve trap/exit bindings.                                      */
/*---------------------------------------------------------------------*/
// @sealed
class TrapVisitor {
   trapStack;
   
   constructor() {
      this.trapStack = [];
   }
   
   visit(ast_node) {
      const ostk = this.trapStack;
      ast_node.trapDepth = ostk.length;

      if (ast_node instanceof ast.Trap) {
	 this.trapStack = ostk.concat([ast_node.trapName]);
	 ast_node.children.forEach(c => c.accept(this));
	 this.trapStack = ostk;
      } else if (ast_node instanceof ast.Exit) {
	 if (ostk.indexOf(ast_node.trapName) === -1) {
	    throw error.SyntaxError(`trap unbound "${ast_node.trapName}".`, ast_node.loc);
	 }

	 // !!! MS 21feb2025: returnCode used to be initialized at
	 // k = 2 and in the following offset substracted 1.
	 // This was not compatible with the new schema where all nodes
	 // now have a returnCode (defaulting to 1)
	 let offset = ostk.length - ostk.lastIndexOf(ast_node.trapName);
	 ast_node.returnCode += offset;
      } else if (ast_node instanceof ast.Run) {
	 this.trapStack = [];
	 ast_node.children.forEach(c => c.accept(this));
	 this.trapStack = ostk;
      } else {
	 ast_node.children.forEach(c => c.accept(this));
      }
   }
}
