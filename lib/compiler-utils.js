/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/compiler-utils.js         */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Sun Sep 30 13:25:12 2018                          */
/*    Last change :  Wed Jan  7 09:17:48 2026 (serrano)                */
/*    Copyright   :  2018-26 Inria                                     */
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

export { InitVisitor, SignalVisitor, TrapVisitor };

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
	       `id "${ast_node.id}" must be unique for node ${ast_node.constructor.name}/${this.ids[ast_node.id].constructor.name} @ ${ast_node.loc.filename}:${ast_node.loc.pos}`);
	 }
	 this.ids[ast_node.id] = ast_node;
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
