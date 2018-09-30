/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/compiler-utils.js         */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Sun Sep 30 13:25:12 2018                          */
/*    Last change :  Sun Sep 30 19:27:54 2018 (serrano)                */
/*    Copyright   :  2018 Inria                                        */
/*    -------------------------------------------------------------    */
/*    Compile utility functions                                        */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
const ast = require( "./ast.js" );
const error = require( "./error.js" );
const net = require( "./net.js" );

//
// Helper function that gives a list of incarnation of K[n] from a
// substatement. It takes account of possible lower incarnation level of
// the superstatement.
//
function get_k_list_child(ast_node, type, childCircuit, k) {
   let depth1 = ast_node.depth;
   let depth2 = childCircuit.astNode.depth;
   let k_list1 = [];
   let k_list2 = childCircuit.k_matrix[k];
   if (!k_list2) {
      return k_list1;
   }

   for (let l in k_list2) {
      if (l <= depth1) {
   	 k_list1[l] = net.makeOr(ast_node, type, "k" + k + "_buffer", l);
	 if (k_list2[l]) {
	    k_list2[l].connectTo(k_list1[l], net.FAN.STD);
	 }
      } else {
	 if (!k_list1[depth1]) {
	    k_list1[depth1] = net.makeOr(ast_node, type,
					  "k" + k + "_buffer", l);
	 }
   	 k_list2[l].connectTo(k_list1[depth1], net.FAN.STD);
      }
   }

   return k_list1;
}


//
// Helper function that gives net buffer connected to RES wires of
// children
//
function get_res_children(ast_node, type, childCircuits) {
   let res = null;

   if (childCircuits.length == 1)
      res = childCircuits[0].res;
   else
      for (let i in childCircuits) {
	 let res_child = childCircuits[i].res;

	 if (res_child) {
	    if (!res)
	       res = net.makeOr(ast_node, type, "buffer_res");
	    res.connectTo(res_child, net.FAN.STD);
	 }
      }

   return res;
}

//
// Helper function that gives SUSP net buffer connected to SUSP wires
// of children
//
function get_susp_children(ast_node, type, childCircuits) {
   let susp = null;

   if (childCircuits.length == 1)
      susp = childCircuits[0].susp;
   else
      for (let i in childCircuits) {
	 let susp_child = childCircuits[i].susp;

	 if (susp_child) {
	    if (!susp)
	       susp = net.makeOr(ast_node, type, "buffer_susp");
	    susp.connectTo(susp_child, net.FAN.STD);
	 }
      }

   return susp;
}

//
// Helper function that gives KILL net list buffer connected to KILL
// list wires of children.
//
// It gens the environment translation of KILL wires (see Esterel
// Constructire Book, page 151).
//
function killListChildren(ast_node, type, childCircuits) {
   let killList = null;

   for (let c in childCircuits) {
      let child = childCircuits[c];
      let childDepth = child.astNode.depth;

      if (child.kill_list) {
	 if (!killList) {
	    killList = [];
	 }

	 for (let i = 0; i <= ast_node.depth; i++) {
	    if (!killList[i]) {
	       killList[i] = net.makeOr(ast_node, type, "buf_kill", i);
	    }
	    killList[i].connectTo(child.kill_list[i], net.FAN.STD);
	 }

	 if (childDepth > ast_node.depth) {
	    if (childDepth != ast_node.depth + 1) {
	       throw error.TypeError("killListChildren: level error", ast_node.loc);
	    }

	    killList[ast_node.depth].connectTo(child.kill_list[childDepth],
						net.FAN.STD);
	 }
      }
   }

   return killList;
}


//
// Visitors and functions thats decorates the AST before circuit
// translation :
//
//    - assign machine reference to each ast node
//    - check unicity of instruction identifier (id XML field)
//    - assign module_instance_id to module/run/let[in run context] nodes
//
// Warning: the current implementation does not guarantee that a
// module instance identifier will be the same if branches containing
// run are added / removed between two reactions. It will be needed
// before the debuggers support that feature.
//
function InitVisitor(machine) {
   this.machine = machine;
   this.ids = [];
   this.next_module_instance_id = 0;
}

InitVisitor.prototype.visit = function( ast_node ) {
   ast_node.machine = this.machine;

   ast_node.net_list = [];

   if (ast_node.id) {
      if (this.ids[ast_node.id])
	 throw error.SyntaxError("id `" + ast_node.id + "' must be unique", ast_node.loc);
      this.ids[ast_node.id] = true;
   }

   if (ast_node instanceof ast.Module) {
      ast_node.module_instance_id = this.next_module_instance_id++;
   } else if (ast_node instanceof ast.Run) {
      let id = this.next_module_instance_id++;
      ast_node.module_instance_id = id;
      ast_node.children[ 0 ].module_instance_id = id;
   }
}

//
// Check unicity of global signal names
// Check unicity of local signal name for a same scope level
// Check validity of bound attribute
//
// Note that the unicity check is useless while the front-end language
// is XML : if more than one attribute is given with the same name,
// only the last will be used.
//
function SignalVisitor(machine) {
   this.machine = machine;
   this.global_names = [];
   this.local_name_stack = [];
   this.local_frame_sz_stack = [];
}

/*---------------------------------------------------------------------*/
/*    visit ...                                                        */
/*---------------------------------------------------------------------*/
SignalVisitor.prototype.visit = function( ast_node ) {
   function _error_already_used( name, loc ) {
      throw error.SyntaxError( "Signal name `" + name + "' already used.",
			       loc );
   }

   let instanceof_let = ast_node instanceof ast.Local;

   if( ast_node instanceof ast.Module ) {
      for( let i in ast_node.sigDeclList ) {
	 let prop = ast_node.sigDeclList[ i ];

	 if( this.global_names.indexOf( prop.name ) > -1 ) {
	    _error_already_used( prop.name, ast_node.loc );
	 }
	 this.global_names.push( prop.name );
      }
   } else if( instanceof_let ) {
      let local_names = [];

      ast_node.sigDeclList.forEach( sigprop => {
	 if( local_names.indexOf( sigprop.name ) > -1 ) {
	    _error_already_used( sigprop.name, ast_node.loc );
	 }
	 local_names.push( sigprop.name );

	 if( sigprop.alias ) {
	    let not_found = signame =>
		this.local_name_stack.indexOf( signame ) == -1 &&
		this.global_names.indexOf( signame ) == -1;

	    if( sigprop.alias == -1 ) {
	       //
	       // From a RUN statement.
	       //
	       if( not_found( sigprop.name ) ) {
		  sigprop.alias = "";
	       } else {
		  sigprop.alias = sigprop.name;
	       }
	    } else if( not_found( sigprop.alias ) ) {
	       throw error.SyntaxError( "Signal `" + sigprop.name + "' " +
					"is bound to an unknown signal " +
					sigprop.alias + ".", ast_node.loc );
	    }
	 }
      } );

      this.local_name_stack = this.local_name_stack.concat( local_names );
      this.local_frame_sz_stack.push( local_names.length );
   }

   for( let c in ast_node.children ) {
      ast_node.children[c].accept( this );
   }

   if( instanceof_let ) {
      let sz = this.local_frame_sz_stack.pop();
      while( sz > 0 ) {
	 this.local_name_stack.pop();
	 sz--;
      }
   }
}

//
// Check trap names exists on Exit nodes
// Compute trap level
//
function TrapVisitor() {
   this.trap_stack = [];
}

TrapVisitor.prototype.visit = function(ast_node) {
   var ast_node_instanceof_trap = ast_node instanceof ast.Trap;

   if (ast_node_instanceof_trap) {
      this.trap_stack.push(ast_node.trap_name);
   }

   for (var i in ast_node.children)
      ast_node.children[i].accept(this);

   if (ast_node_instanceof_trap) {
      this.trap_stack.pop();
   } else if (ast_node instanceof ast.Exit) {
      if (this.trap_stack.indexOf(ast_node.trap_name) == -1)
	 throw error.SyntaxError("Unknown trap name " +
				 ast_node.trap_name + ".", ast_node.loc);

      let offset = this.trap_stack.length
	  - this.trap_stack.lastIndexOf(ast_node.trap_name) - 1;
      ast_node.return_code += offset;
   }
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.InitVisitor = InitVisitor;
exports.SignalVisitor = SignalVisitor;
exports.TrapVisitor = TrapVisitor;
exports.get_k_list_child = get_k_list_child;
exports.get_res_children = get_res_children;
exports.get_susp_children = get_susp_children;
exports.killListChildren = killListChildren;
