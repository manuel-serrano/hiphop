/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/compiler.js               */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Mon Jul 16 18:06:28 2018                          */
/*    Last change :  Mon May 27 13:41:22 2019 (serrano)                */
/*    Copyright   :  2018-19 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop compiler                                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
const ast = require( "./ast.js" );
const error = require( "./error.js" );
const net = require( "./net.js" );
const signal = require( "./signal.js" );
const lang = require( "./lang.js" );
const ccutils = require( "./compiler-utils.js" );

/*---------------------------------------------------------------------*/
/*    Circuit ...                                                      */
/*    -------------------------------------------------------------    */
/*    Circuit definition of a circuit. It also contains methods        */
/*    to get embeded RES, SUSP and KILL wires.                         */
/*---------------------------------------------------------------------*/
function Circuit( ast_node, type, go_list, res, susp, 
		  kill_list, sel, k_matrix ) {
   this.astNode = ast_node;
   this.type = type;

   if( !(go_list instanceof Array) )
      throw error.TypeError( "`go_list` must be an array.", ast_node.loc );
   this.go_list = go_list;

   if( kill_list && !(kill_list instanceof Array) )
      throw error.TypeError( "`kill_list` must be an array.", ast_node.loc) ;
   this.kill_list = kill_list;

   if( !(k_matrix instanceof Array) )
      throw error.TypeError( "`k_matrix must be a matrix.", ast_node.loc );

   for( let k = 0; k < k_matrix.length; k++ ) {
      if( !(k_matrix[ k ] instanceof Array) ) {
	 if( k_matrix[ k ] ) {
	    throw error.TypeError( "Each completion code of `k_matrix` " +
				   "must be an array \"" +
				   k_matrix[ k ].toString() +
				   "\".", ast_node.loc );
	 }
      }
   }
   
   this.k_matrix = k_matrix;
   this.res = res;
   this.susp = susp;
   this.sel = sel;
}

/*---------------------------------------------------------------------*/
/*    getSignalObject ...                                              */
/*    -------------------------------------------------------------    */
/*    Lookup the signal declaration.                                   */
/*    Env is a list of SignalProperties (see ast.js).                  */
/*---------------------------------------------------------------------*/
function getSignalObject( env, signame, ast_node ) {
   
   function unbound_error() {
      throw error.TypeError( `${ast_node.tag}: unbound signal "${signame}".`, 
			     ast_node.loc );
   }
      
   for( let i = env.length - 1; i >= 0; i-- ) {
      let sigprop = env[ i ];

      if( signame === sigprop.name ) {
	 if( sigprop.signal ) {
	    return sigprop.signal;
	 } else {
	    err();
	 }
      }
   }

   unbound_error();
}

/*---------------------------------------------------------------------*/
/*    signalGate ...                                                   */
/*    -------------------------------------------------------------    */
/*    Returns the signal gate at a specific incarnation level.         */
/*---------------------------------------------------------------------*/
function signalGate( sig, lvl ) {
   let gate_list = sig.gate_list;

   if( gate_list.length <= lvl ) {
      return gate_list[ gate_list.length - 1 ];
   } else {
      return gate_list[ lvl ];
   }
}

/*---------------------------------------------------------------------*/
/*    bindSigAccessorList ...                                          */
/*    -------------------------------------------------------------    */
/*    Bind each signal of sigList to its signal declaration.           */
/*---------------------------------------------------------------------*/
function bindSigAccessorList( env, siglist, ast_node ) {
   siglist.forEach( sigprop => {
      sigprop.signal = getSignalObject( env, sigprop.signame, ast_node );
   } );
}

/*---------------------------------------------------------------------*/
/*    linkSigDeclList ...                                              */
/*---------------------------------------------------------------------*/
function linkSigDeclList( env, siglist, ast_node ) {
   siglist.forEach( sigdecl => {
      	    if( sigdecl.alias ) {
	       sigdecl.signal = getSignalObject( env, sigdecl.alias, ast_node );
      	    }
      } );
}

/*---------------------------------------------------------------------*/
/*    linkNode ...                                                     */
/*---------------------------------------------------------------------*/
function linkNode( ast_node ) {
   //
   // This function must be called *only* in ast.*.makeCircuit() and
   // *never* in make*. Otherwise, it could result that the oneshot
   // register is push not on the top of dynamically added branch but
   // inside an embded instruction
   //
   if( ast_node.dynamic ) {
      let reg = new net.RegisterNet( ast_node, ast_node.constructor, 
				     "oneshot_register" );
      let const0 = net.makeOr( ast_node, ast_node.constructor,
			       "oneshot_register_reset" );

      const0.connectTo( reg, net.FAN.STD );
      reg.connectTo( const0, net.FAN.DEP );
      reg.connectTo( ast_node.circuit.go_list[ ast_node.depth ], net.FAN.STD );
      reg.dynamic = true;
      ast_node.dynamic = false;
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::ASTNode ...                                        */
/*---------------------------------------------------------------------*/
ast.ASTNode.prototype.makeCircuit = function( env ) {
   throw error.TypeError( "makeCircuit: no implementation for this node `"
			  + this.tag + "'",
			  this.loc );
}

/*---------------------------------------------------------------------*/
/*    makeExpressionNet ...                                            */
/*---------------------------------------------------------------------*/
function makeExpressionNet( env, ast_node, node, 
			    start_nets, true_nets, false_nets, 
			    level ) {
   let res = null;

   if( ast_node.func || ast_node.accessor_list.length > 0 ) {
      bindSigAccessorList( env, ast_node.accessor_list, ast_node );
      res = new net.TestExpressionNet( ast_node, node, "testexpr", level,
				       ast_node.func, ast_node.accessor_list );
      
      start_nets.forEach( n => n.connectTo( res, net.FAN.STD ) );
      true_nets.forEach( n => res.connectTo( n, net.FAN.STD ) );
      false_nets.forEach( n => res.connectTo( n, net.FAN.NEG ) );
   }

   return res;
}

/*---------------------------------------------------------------------*/
/*    makeCounterNet ...                                               */
/*---------------------------------------------------------------------*/
function makeCounterNet( env, ast_node, type, 
			 start_nets, reset_nets, true_nets, false_nets ) {
   let counter = 0;
   let decr_counter_func = function() {
      if( counter > 0 ) counter--;
      return counter == 0;
   }

   let res = new net.TestExpressionNet( ast_node, type, "decr_counter",
					0, decr_counter_func, [] );
   
   let func_count = ast_node.func_count;
   let init_counter_func = function() {
      let init_val = parseInt( func_count.call( this ) );

      if( init_val < 1 ) {
	 error.RuntimeError( "Assert counter expression > 0 failed.", 
			     ast_node.loc );
      }
      counter = init_val;
   }

   bindSigAccessorList( env, ast_node.accessor_list_count, ast_node );
   let init_net = new net.ActionNet( ast_node, type, "init_counter", 0,
				     init_counter_func,
				     ast_node.accessor_list_count );
   let init_or = net.makeOr( ast_node, type, "init_or" );

   start_nets.forEach( n => n.connectTo( res, net.FAN.STD ) );
   init_or.connectTo( init_net, net.FAN.STD );
   reset_nets.forEach( n => n.connectTo( init_or, net.FAN.STD ) );
   true_nets.forEach( n => res.connectTo( n, net.FAN.STD ) );
   false_nets.forEach( n => res.connectTo( n , net.FAN.NEG ) );
   
   return res;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Fork ...                                           */
/*---------------------------------------------------------------------*/
ast.Fork.prototype.makeCircuit = function( env ) {
   
   function makeParallelCircuit( env, ast_node, childCircuits ) {
      let go_list = [];
      let res = null;
      let susp = null;
      let kill_list = null;
      let sel = null;
      let k_matrix = [];

      // Broadcast GO
      for( let l = 0; l <= ast_node.depth; l++ ) {
	 childCircuits.forEach( c => {
	    let child_go = c.go_list[ l ];

	    if( child_go ) {
	       if( !go_list[ l ] ) {
		  go_list[ l ] = net.makeOr( ast_node, ast.Fork, "go", l );
	       }
	       go_list[ l ].connectTo( child_go, net.FAN.STD );
	    }
	 } );
      }

      // Broadcast RES, SUSP, KILL
      res = ccutils.get_res_children( ast_node, ast.Fork, childCircuits );
      susp = ccutils.get_susp_children( ast_node, ast.Fork, childCircuits );
      kill_list = ccutils.killListChildren( ast_node, ast.Fork, childCircuits );

      // Union on SEL
      childCircuits.forEach( c => {
	 let child_sel = c.sel;

	 if( child_sel ) {
	    if( !sel ) {
	       sel = net.makeOr( ast_node, ast.Fork, "sel" );
	    }
	    child_sel.connectTo( sel, net.FAN.STD );
	 }
      } )

      // union is a matrix which is indexed by return code and then by
      // incarnation level.
      let union = [];

      // min is a 3D array which is indexed by children, by return code
      // and then by incarnation level
      let min = [];

      // max completion code of the parallel + 1
      let max = 0;

      childCircuits.forEach( c => {
	 if( c.k_matrix.length > max ) {
	    max = c.k_matrix.length;
	 }
      } );

      // Union K of children
      childCircuits.forEach( iChild => {
	 for( let k = 0; k < max; k++ ) {
	    if( !union[ k ] ) {
	       union[ k ] = [];
	       for( let i = 0; i <= ast_node.depth; i++ ) {
		  union[ k ][ i ] = 
		     net.makeOr( ast_node, ast.Fork, "union_k" + k, i );
	       }
	    }
	    let kList = ccutils.get_k_list_child( ast_node, ast.Fork, iChild, k );
	    for( let i = 0; i <= ast_node.depth; i++ ) {
	       if( kList[i] ) {
		  kList[ i ].connectTo( union[ k ][ i ], net.FAN.STD );
	       }
	    }
	 }
      } );

      // Connect EXIT to KILL
      if( kill_list ) {
	 for( let k = 2; k < union.length; k++ ) {
	    for( let i = union[ k ].length - 1; i >= 0; i-- ) {
	       if( !kill_list[ i ] ) {
		  kill_list[ i ] = net.makeOr( ast_node, ast.Fork, "pkill", i );
	       }
	       union[ k ][ i ].connectTo( kill_list[ i ], net.FAN.STD );
	    }
	 }
      }

      // Min of children
      for( let c = childCircuits.length - 1; c >= 0; c-- ) {
	 let child_interface = childCircuits[ c ];
	 let child_k_matrix = child_interface.k_matrix;
	 let child_min_matrix = [];

	 min[ c ] = child_min_matrix;
	 child_min_matrix[ 0 ] = [];


	 // connect all incarnation of K0 of child
	 for( let l = 0; l <= ast_node.depth; l++ ) {
	    child_min_matrix[ 0 ][ l ] = 
	       net.makeOr(ast_node, ast.Fork, "or_min_k0" + "_child" + c, l);
	    if( child_k_matrix[ 0 ] && child_k_matrix[ 0 ][ l ] ) {
	       child_k_matrix[ 0 ][ l ]
		  .connectTo( child_min_matrix[ 0 ][ l ], net.FAN.STD );
	    }
	 }

	 // connect OR-NOT door with GO of parallel and SEL of child
	 let sel_not = net.makeOr( ast_node, ast.Fork, "sel_not_child" + c );

	 go_list[ ast_node.depth ].connectTo( sel_not, net.FAN.STD );
	 if( child_interface.sel ) {
	    child_interface.sel.connectTo( sel_not, net.FAN.STD ); 
	 }
	 sel_not.connectTo( child_min_matrix[ 0 ][ ast_node.depth ], net.FAN.NEG );

	 // connect all incarnation of child min Kn-1 to child min Kn
	 for( let k = 1; k < max; k++ ) {
	    child_min_matrix[ k ] = [];

	    for( let l = 0; l <= ast_node.depth; l++ ) {
	       child_min_matrix[ k ][ l ] = 
		  net.makeOr( ast_node, ast.Fork,
			      "or_min_k" + k + "_child" + c,
			      l );
	       child_min_matrix[ k - 1 ][ l ]
		  .connectTo( child_min_matrix[ k ][ l ], net.FAN.STD );
	       if( child_k_matrix[ k ] && child_k_matrix[ k ][ l ] ) {
		  child_k_matrix[ k ][ l ]
		     .connectTo( child_min_matrix[ k ][ l ], net.FAN.STD );
	       }
	    }
	 }
      }

      // Build K output doors and connect union to them
      for( let k = union.length - 1; k >= 0; k-- ) {
	 k_matrix[ k ] = [];
	 for( let l = union[ k ].length - 1; l >= 0; l-- ) {
	    k_matrix[ k ][ l ] = 
	       net.makeAnd( ast_node, ast.Fork, "and_k" + k, l );
	    union[ k ][ l ].connectTo( k_matrix[ k ][ l ], net.FAN.STD );
	 }
      }

       // Connect min to K output doors
      for( let c = min.length - 1; c >= 0; c-- ) {
	 for( let k = min[ c ].length - 1; k >= 0; k-- ) {
	    for( let l = min[ c ][ k ].length - 1; l >= 0; l-- ) {
	       min[ c ][ k ][ l ].connectTo( k_matrix[ k ][ l ], net.FAN.STD );
	    }
	 }
      }

      return new Circuit( ast_node, ast.Fork, go_list, res, susp,
    			  kill_list, sel, k_matrix );
   }
   
   let ccs = this.children.map( (c, i, arr) => c.makeCircuit( env ) );
   let circuit = makeParallelCircuit( env, this, ccs );
   this.circuit = circuit;
   

   linkNode( this );
   return circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Fork ...                                           */
/*---------------------------------------------------------------------*/
ast.Fork.prototype.makeCircuitOld = function( env ) {
   
   function makeParallelCircuit( env, ast_node, childCircuits ) {
      let go_list = [];
      let res = null;
      let susp = null;
      let kill_list = null;
      let sel = null;
      let k_matrix = [];

      // Broadcast GO
      for( let l = 0; l <= ast_node.depth; l++ ) {
	 childCircuits.forEach( c => {
	    let child_go = c.go_list[ l ];

	    if( child_go ) {
	       if( !go_list[ l ] ) {
		  go_list[ l ] = net.makeOr( ast_node, ast.Fork, "go", l );
	       }
	       go_list[ l ].connectTo( child_go, net.FAN.STD );
	    }
	 } );
      }

      // Broadcast RES, SUSP, KILL
      res = ccutils.get_res_children( ast_node, ast.Fork, childCircuits );
      susp = ccutils.get_susp_children( ast_node, ast.Fork, childCircuits );
      kill_list = ccutils.killListChildren( ast_node, ast.Fork, childCircuits );

      // Union on SEL
      childCircuits.forEach( c => {
	 let child_sel = c.sel;

	 if( child_sel ) {
	    if( !sel ) {
	       sel = net.makeOr( ast_node, ast.Fork, "sel" );
	    }
	    child_sel.connectTo( sel, net.FAN.STD );
	 }
      } )

      //
      // --------------------- Synchronizer ---------------------
      //

      // union is a matrix which is indexed by return code and then by
      // incarnation level.
      let union = [];

      // min is a 3D array which is indexed by children, by return code
      // and then by incarnation level
      let min = [];

      // max completion code of the parallel + 1
      let max = 0;

      childCircuits.forEach( c => {
	 if( c.k_matrix.length > max ) {
	    max = c.k_matrix.length;
	 }
      } );

      // Union K of children
      childCircuits.forEach( iChild => {
	 for( let k = 0; k < max; k++ ) {
	    if( !union[ k ] ) {
	       union[ k ] = [];
	       for( let i = 0; i <= ast_node.depth; i++ ) {
		  union[ k ][ i ] = 
		     net.makeOr( ast_node, ast.Fork, "union_k" + k, i );
	       }
	    }
	    let kList = ccutils.get_k_list_child( ast_node, ast.Fork, iChild, k );
	    for( let i = 0; i <= ast_node.depth; i++ ) {
	       if( kList[i] ) {
		  kList[ i ].connectTo( union[ k ][ i ], net.FAN.STD );
	       }
	    }
	 }
      } );

      // Connect EXIT to KILL
      if( kill_list ) {
	 for( let k = 2; k < union.length; k++ ) {
	    for( i = union[ k ].length - 1; i >= 0; i-- ) {
	       if( !kill_list[ i ] ) {
		  kill_list[ i ] = net.makeOr( ast_node, ast.Fork, "pkill", i );
	       }
	       union[ k ][ i ].connectTo( kill_list[ i ], net.FAN.STD );
	    }
	 }
      }

      // Min of children
      for( let c = childCircuits.length - 1; c >= 0; c-- ) {
	 let child_interface = childCircuits[ c ];
	 let child_k_matrix = child_interface.k_matrix;
	 let child_min_matrix = [];

	 min[ c ] = child_min_matrix;
	 child_min_matrix[ 0 ] = [];

	 // connect all incarnation of K0 of child
	 for( let l = 0; l <= ast_node.depth; l++ ) {
	    child_min_matrix[ 0 ][ l ] = 
	       net.makeOr(ast_node, ast.Fork, "or_min_k0" + "_child" + c, l);
	    if( child_k_matrix[ 0 ] && child_k_matrix[ 0 ][ l ] ) {
	       child_k_matrix[ 0 ][ l ]
		  .connectTo( child_min_matrix[ 0 ][ l ], net.FAN.STD );
	    }
	 }

	 // connect OR-NOT door with GO of parallel and SEL of child
	 let sel_not = net.makeOr( ast_node, ast.Fork, "sel_not_child" + c );

	 go_list[ ast_node.depth ].connectTo( sel_not, net.FAN.STD );
	 if( child_interface.sel ) {
	    child_interface.sel.connectTo( sel_not, net.FAN.STD ); 
	 }
	 sel_not.connectTo( child_min_matrix[ 0 ][ ast_node.depth ], net.FAN.NEG );

	 // connect all incarnation of child min Kn-1 to child min Kn
	 for( let k = 1; k < max; k++ ) {
	    child_min_matrix[ k ] = [];

	    for( let l = 0; l <= ast_node.depth; l++ ) {
	       child_min_matrix[ k ][ l ] = 
		  net.makeOr( ast_node, ast.Fork,
			      "or_min_k" + k + "_child" + c,
			      l );
	       child_min_matrix[ k - 1 ][ l ]
		  .connectTo( child_min_matrix[ k ][ l ], net.FAN.STD );
	       if( child_k_matrix[ k ] && child_k_matrix[ k ][ l ] ) {
		  child_k_matrix[ k ][ l ]
		     .connectTo( child_min_matrix[ k ][ l ], net.FAN.STD );
	       }
	    }
	 }
      }

      // Build K output doors and connect union to them
      for( let k = union.length - 1; k >= 0; k-- ) {
	 k_matrix[ k ] = [];
	 for( let l = union[ k ].length - 1; l >= 0; l-- ) {
	    k_matrix[ k ][ l ] = 
	       net.makeAnd( ast_node, ast.Fork, "and_k" + k, l );
	    union[ k ][ l ].connectTo( k_matrix[ k ][ l ], net.FAN.STD );
	 }
      }

      // Connect min to K output doors
      for( let c = min.length - 1; c >= 0; c-- ) {
	 for( let k = min[ c ].lenght - 1; k >= 0; k-- ) {
	    for( let l = min[ c ][ k ].length - 1; l >=0; l-- ) {
	       min[ c ][ k ][ l ].connectTo( k_matrix[ k ][ l ], net.FAN.STD );
	    }
	 }
      }

      return new Circuit( ast_node, ast.Fork, go_list, res, susp,
    			  kill_list, sel, k_matrix );
   }
   
   let ccs = this.children.map( (c, i, arr) => c.makeCircuit( env ) );
   let circuit = makeParallelCircuit( env, this, ccs );
   this.circuit = circuit;
   
   linkNode( this );
   return circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Trap ...                                           */
/*---------------------------------------------------------------------*/
ast.Trap.prototype.makeCircuit = function( env ) {
   
   function makeTrapCircuit( env, ast_node, child_interface ) {
      if (child_interface.k_matrix.length <= 2)
	 return child_interface;

      let k0_list = [];
      let k_matrix_child = child_interface.k_matrix;
      let k_matrix = [k0_list];
      let k0_list_child = ccutils.get_k_list_child(ast_node, ast.Trap, child_interface, 0);
      let trap_gate_list = ccutils.get_k_list_child(ast_node, ast.Trap,
					    child_interface, 2);

      //
      // Get K0 of child, and connect it to K0 output door
      //
      for (let l in k0_list_child) {
	 k0_list[l] = net.makeOr(ast_node, ast.Trap, "or_k0", l);
	 k0_list_child[l].connectTo(k0_list[l], net.FAN.STD);
      }

      //
      // Get K2 of child, and connect it to K0 output door
      //
      for (let l in trap_gate_list) {
	 if (!k0_list[l])
	    k0_list[l] = net.makeOr(ast_node, ast.Trap, "or_k0", l);
	 trap_gate_list[l].connectTo(k0_list[l], net.FAN.STD);
      }

      //
      // Propagate K1 of child and Shift K > 2
      //
      k_matrix[1] = ccutils.get_k_list_child(ast_node, ast.Trap, child_interface, 1);
      for (let k = 3; k < k_matrix_child.length; k++)
	 k_matrix[k - 1] = ccutils.get_k_list_child(ast_node, ast.Trap,
					    child_interface, k);

      return new Circuit(ast_node, ast.Trap,
			   child_interface.go_list,
			   child_interface.res,
			   child_interface.susp,
			   ccutils.killListChildren(ast_node, ast.Trap, [child_interface]),
			   child_interface.sel,
			   k_matrix);
   }

   const cc0 = this.children[ 0 ].makeCircuit( env );
   this.circuit = makeTrapCircuit( env, this, cc0 );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Exit ...                                           */
/*---------------------------------------------------------------------*/
ast.Exit.prototype.makeCircuit = function( env ) {
   
   function makeExitCircuit( env, ast_node ) {
      let go_list = [];
      let k_matrix = [];

      k_matrix[ ast_node.returnCode ] = [];

      for( let i = 0; i <= ast_node.depth; i++ ) {
	 let go = net.makeOr( ast_node, ast.Exit, "go", i );

	 go_list[ i ] = go;
	 k_matrix[ ast_node.returnCode ][ i ] = go;
      }

      return new Circuit( ast_node, ast.Exit, go_list, 
			  null, null, null, null,
			  k_matrix );
   }

   this.circuit = makeExitCircuit( env, this );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeSequenceCircuit ...                                          */
/*---------------------------------------------------------------------*/
function makeSequenceCircuit( env, ast_node, childCircuits ) {
   let len = childCircuits.length;
   let sel = null;
   let k_matrix = [[]];
   let i = 0;

   for( i = 0; i < len; i++ ) {
      let childCircuit = childCircuits[ i ];

      // connect each KO incarnation of child[N] to each GO
      // incarnation of child[N + 1]
      if( i + 1 < len ) {
	 let next_depth = childCircuits[ i + 1 ].astNode.depth;
	 let next_go_list = childCircuits[ i + 1 ].go_list;

	 for( let l = 0; l <= childCircuit.astNode.depth; l++ ) {
	    if( !childCircuit.k_matrix[ 0 ] 
		|| !childCircuit.k_matrix[ 0 ][ l ] ) 
	       continue;
	    let next_l = l;

	    if( l > next_depth ) {
	       next_l = next_depth;
	    }
	    childCircuit.k_matrix[ 0 ][ l ]
	       .connectTo( next_go_list[ next_l ], net.FAN.STD );
	 }
      }

      // connect SEL if needed
      if( childCircuit.sel ) {
	 if( !sel ) {
	    sel = net.makeOr( ast_node, ast.Sequence, "sel" );
	 }
	 childCircuit.sel.connectTo( sel, net.FAN.STD );
      }

      // connects Kn where n > 0
      for( let j = 1; j < childCircuit.k_matrix.length; j++ ) {
	 let kList = 
	     ccutils.get_k_list_child( ast_node, ast.Sequence, childCircuit, j );

	 if( !k_matrix[ j ] ) {
	    k_matrix[ j ] = [];
	 }

	 for( let l = 0; l < kList.length; l++ ) {
	    if (!k_matrix[j][l]) {
	       k_matrix[j][l] = net.makeOr(ast_node, ast.Sequence, "buf_k" + j + "_buffer_output", l);
	    }
	    kList[ l ].connectTo( k_matrix[ j ][ l ], net.FAN.STD );
	 }
      }
   }

   // get K0 of last child
   k_matrix[ 0 ] = 
      ccutils.get_k_list_child( ast_node, ast.Sequence, childCircuits[len - 1], 0 );

   //
   // get RES of children
   //
   let res = ccutils.get_res_children( ast_node, ast.Sequence, childCircuits );

   //
   // get SUSP of children
   //
   let susp = ccutils.get_susp_children( ast_node, ast.Sequence, childCircuits );

   //
   // get KILL list of children
   //
   let kill_list = ccutils.killListChildren( ast_node, ast.Sequence, childCircuits );

   return new Circuit( ast_node, ast.Sequence, childCircuits[ 0 ].go_list,
		       res, susp, kill_list, sel, k_matrix );
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sequence ...                                       */
/*---------------------------------------------------------------------*/
ast.Sequence.prototype.makeCircuit = function( env ) {
   let ccs = this.children.map( (c, i, arr) => c.makeCircuit( env ) );
   this.circuit = makeSequenceCircuit( env, this, ccs );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Pause ...                                          */
/*---------------------------------------------------------------------*/
ast.Pause.prototype.makeCircuit = function( env ) {
   this.circuit = makePauseCircuit( env, this );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makePauseCircuit ...                                             */
/*---------------------------------------------------------------------*/
function makePauseCircuit( env, ast_node ) {
   let go_list = [];
   let kill_list = [];
   let k_matrix = [[], []];
   let reg = new net.RegisterNet( ast_node, ast.Pause, "reg" );
   let and_to_reg = net.makeAnd( ast_node, ast.Pause, "and_to_reg" );
   let or_to_reg = net.makeOr( ast_node, ast.Pause, "or_to_reg" );
   let and_to_k0 = net.makeAnd( ast_node, ast.Pause, "and_to_k0" );

   and_to_reg.connectTo( or_to_reg, net.FAN.STD );
   or_to_reg.connectTo( reg, net.FAN.STD );
   reg.connectTo( and_to_k0, net.FAN.STD );
   reg.connectTo( and_to_reg, net.FAN.STD );
   k_matrix[0][ast_node.depth] = and_to_k0;

   for( let i = 0; i <= ast_node.depth; i++ ) {
      let go = net.makeOr( ast_node, ast.Pause, "go", i );
      go_list[ i ] = go;
      k_matrix[ 1 ][ i ] = go;

      let kill = net.makeOr( ast_node, ast.Pause, "kill", i );
      kill_list[ i ] = kill;

      let and = net.makeAnd( ast_node, ast.Pause, "and", i );
      go.connectTo( and, net.FAN.STD );
      kill.connectTo( and, net.FAN.NEG );
      and.connectTo( or_to_reg, net.FAN.STD );
   }

   kill_list[ ast_node.depth ].connectTo( and_to_reg, net.FAN.NEG );

   return new Circuit( ast_node, ast.Pause, go_list, and_to_k0, and_to_reg,
		       kill_list, reg, k_matrix );
}

/*---------------------------------------------------------------------*/
/*    makeAwaitCircuit ...                                             */
/*---------------------------------------------------------------------*/
function makeAwaitCircuit( env, ast_node ) {
   const chalt = makeHaltCircuit( env, ast_node );
   return makeAbortCircuit( env, ast_node, chalt, false );
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Await ...                                          */
/*---------------------------------------------------------------------*/
ast.Await.prototype.makeCircuit = function( env ) {
   return this.circuit = makeAwaitCircuit( env, this );
}

/*---------------------------------------------------------------------*/
/*    makeLoopeachCircuit ...                                          */
/*---------------------------------------------------------------------*/
function makeLoopeachCircuit( env, ast_node, childCircuit) {
   const halt = makeHaltCircuit( env, ast_node );
   const seq = makeSequenceCircuit( env, ast_node, [ childCircuit, halt ] )
   const abort = makeAbortCircuit( env, ast_node, seq, true );
   
   return makeLoopCircuit( env, ast_node, abort );
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Every ...                                          */
/*---------------------------------------------------------------------*/
ast.Every.prototype.makeCircuit = function( env ) {
   this.children[0].makeCircuit( env );
   const cloopeach = makeLoopeachCircuit( env, this, this.children[ 0 ].circuit );
   const cawait = makeAwaitCircuit( env, this );
   this.circuit = makeSequenceCircuit( env, this, [ cawait, cloopeach ] );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::LoopEach ...                                       */
/*---------------------------------------------------------------------*/
ast.LoopEach.prototype.makeCircuit = function( env ) {
   this.children[ 0 ].makeCircuit( env );
   this.circuit = makeLoopeachCircuit( env, this, this.children[ 0 ].circuit );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Loop ...                                           */
/*---------------------------------------------------------------------*/
ast.Loop.prototype.makeCircuit = function( env ) {
   this.children[ 0 ].makeCircuit( env );
   this.circuit = makeLoopCircuit( env, this, this.children[ 0 ].circuit );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeLoopCircuit ...                                              */
/*---------------------------------------------------------------------*/
function makeLoopCircuit( env, ast_node, childCircuit ) {
   let depth1 = ast_node.depth;
   let depth2 = childCircuit.astNode.depth;
   let go_list = [];
   let k_matrix = [[]];

   for( let l = 0; l <= depth1; l++ ) {
      let or =  net.makeOr( ast_node, ast.Loop, "go", l );

      or.connectTo( childCircuit.go_list[ l ], net.FAN.STD );
      go_list[ l ] = or;
   }

   //
   // Error on instantaneous loop, and connect K0[depth2] on K0[depth1]
   //
   for( let l = 0; l <= depth2; l++ ) {
      if (childCircuit.k_matrix[0][l] && (depth2 == 0 || l < depth2))
	 childCircuit.k_matrix[0][l].connectTo(
	    new net.ActionNet( ast_node, ast.Loop, "error", l,
			       function() {
				  throw error.TypeError(
				     "Instantaneous loop.", ast_node.loc ) },
			       [] ),
	    net.FAN.STD );
   }

   if( childCircuit.k_matrix[0][depth2] ) {
      childCircuit.k_matrix[0][depth2]
	 .connectTo( go_list[depth1], net.FAN.STD );
   }

   for( let k = 1; k < childCircuit.k_matrix.length; k++ ) {
      k_matrix[ k ] = ccutils.get_k_list_child( ast_node, ast.Loop, childCircuit, k );
   }

   let kill_list = ccutils.killListChildren( ast_node, ast.Loop, [ childCircuit ] );

   return new Circuit( ast_node, ast.Loop, go_list, childCircuit.res,
		       childCircuit.susp, kill_list, childCircuit.sel,
		       k_matrix );
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Nothing ...                                        */
/*---------------------------------------------------------------------*/
ast.Nothing.prototype.makeCircuit = function( env ) {
   this.circuit = makeNothingCircuit( env, this );

   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeNothingCircuit ...                                           */
/*---------------------------------------------------------------------*/
function makeNothingCircuit( env, ast_node ) {
   let go_list = [];
   let k_matrix = [[]];

   for( let i = 0; i <= ast_node.depth; i++ ) {
      let go = net.makeOr( ast_node, ast.Nothing, "go", i );

      go_list[ i ] = go;
      k_matrix[ 0 ][ i ] = go;
   }

   return new Circuit( ast_node, ast.Nothing, go_list, 
		       null, null, null, null,
		       k_matrix );
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Atom ...                                           */
/*---------------------------------------------------------------------*/
ast.Atom.prototype.makeCircuit = function( env ) {
   let go_list = [];
   let k_matrix = [ go_list ];
   let atomFunc = this.func;
   let frame = this.frame;
   let func = frame ? function() { atomFunc( frame ) } : atomFunc;

   for( let i = 0; i <= this.depth; i++ ) {
      bindSigAccessorList( env, this.accessor_list, this );

      let go = net.makeOr( this, ast.Atom, "go", i );
      let action = new net.ActionNet( this, ast.Atom, "action", i, 
	 func, this.accessor_list );

      go.connectTo( action, net.FAN.STD );
      go_list[ i ] = go;

   }

   this.circuit = new Circuit( this, ast.Atom, go_list, null, null, null,
			       null, k_matrix );
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Suspend ...                                         */
/*---------------------------------------------------------------------*/
ast.Suspend.prototype.makeCircuit = function( env ) {
   const cc0 = this.children[ 0 ].makeCircuit( env );
   this.circuit = makeSuspendCircuit( env, this, cc0 );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeSuspendCircuit ...                                           */
/*---------------------------------------------------------------------*/
function makeSuspendCircuit( env, ast_node, childCircuit ) {
   let and1 = net.makeAnd( ast_node, ast.Suspend, "and1_sel_res" );
   let and2 = net.makeAnd( ast_node, ast.Suspend, "and2_negtest_and1" );
   let and3 = net.makeAnd( ast_node, ast.Suspend, "and3_test_and1" );
   let or1 = net.makeOr( ast_node, ast.Suspend, "or1_susp_and3" );
   let or2 = net.makeOr( ast_node, ast.Suspend, "or2_k1_and3" );
   let k_matrix = [];

   and1.connectTo(and2, net.FAN.STD);
   and1.connectTo(and3, net.FAN.STD);
   and3.connectTo(or1, net.FAN.STD);
   and3.connectTo(or2, net.FAN.STD);

   if (childCircuit.sel) {
      childCircuit.sel.connectTo(and1, net.FAN.STD);
   }

   if (childCircuit.res) {
      and2.connectTo(childCircuit.res, net.FAN.STD);
   }

   if (childCircuit.susp) {
      or1.connectTo(childCircuit.susp, net.FAN.STD);
   }

   makeExpressionNet( env, ast_node, ast.Suspend, [ and1 ], [ and3 ], [ and2 ],
		      ast_node.depth );

   for( let k = 0; k < childCircuit.k_matrix.length; k++ ) {
      k_matrix[k] = ccutils.get_k_list_child(ast_node, ast.Suspend, childCircuit, k);
   }

   if( k_matrix.length > 1 ) {
      if( k_matrix[ 1 ][ ast_node.depth ] ) {
      	 or2.connectTo( k_matrix[ 1 ][ ast_node.depth ], net.FAN.STD );
      }
   }

   let killList = ccutils.killListChildren( ast_node, ast.Suspend, [childCircuit] );

   return new Circuit( ast_node, ast.Suspend, childCircuit.go_list,
		       and1, or1, killList, childCircuit.sel, k_matrix );
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::WeakAbort ...                                      */
/*---------------------------------------------------------------------*/
ast.WeakAbort.prototype.makeCircuit = function( env ) {
   this.circuit = this.children[ 0 ].makeCircuit( env );

   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Abort ...                                          */
/*---------------------------------------------------------------------*/
ast.Abort.prototype.makeCircuit = function( env ) {
   const cc = this.children[ 0 ].makeCircuit( env );
   this.circuit = makeAbortCircuit( env, this, cc, false );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeAbortCircuit ...                                             */
/*---------------------------------------------------------------------*/
function makeAbortCircuit( env, ast_node, childCircuit, force_non_immediate ) {
   
   function makeAbortInner( env, ast_node, childCircuit ) {
      let and1 = net.makeAnd(ast_node, ast.Abort, "and1_sel_res");
      let and2 = net.makeAnd(ast_node, ast.Abort, "and2_negtest_and1");
      let and3 = net.makeAnd(ast_node, ast.Abort, "and3_test_and1");
      let or = net.makeOr(ast_node, ast.Abort, "or_and3_k0");
      let go_list = [];
      let k_matrix = [[]];

      for( let l = 0; l <= ast_node.depth; l++ ) {
	 let go = net.makeOr( ast_node, ast.Abort, "go", l );

	 go.connectTo( childCircuit.go_list[ l ], net.FAN.STD );
	 go_list[ l ] = go;
      }

      //
      // Special case for Exec
      //
      if (ast_node instanceof ast.Exec) {
	 ast_node.exec_status.callback_wire.connectTo(and3, net.FAN.STD);
	 ast_node.exec_status.callback_wire.connectTo(and2, net.FAN.NEG);
      } else if (ast_node.func_count) {
	 //
	 // If a counter must be created, AND and AND-not gates must be
	 // connected only on the counter output (and not on expr test)
	 //
	 let decr_list = [];

	 decr_list[0] = makeExpressionNet( env, ast_node, ast.Abort, [and1], [], [],
				       ast_node.depth);
	 decr_list[1] = and1;
	 makeCounterNet( env, ast_node, ast.Abort, decr_list, go_list, [and3], [and2]);
      } else {
	 makeExpressionNet( env, ast_node, ast.Abort, [and1], [and3], [and2],
			ast_node.depth);
      }

      and1.connectTo(and2, net.FAN.STD);
      and1.connectTo(and3, net.FAN.STD);
      and3.connectTo(or, net.FAN.STD);

      //
      // connect SEL of subcircuit
      //
      if (childCircuit.sel)
	 childCircuit.sel.connectTo(and1, net.FAN.STD);

      //
      // connect to RES of subcircuit
      //
      if (childCircuit.res)
	 and2.connectTo(childCircuit.res, net.FAN.STD);

      //
      // connect K0 on depth
      //
      let k0 = childCircuit.k_matrix[0][childCircuit.astNode.depth]
      if (k0)
	 k0.connectTo(or, net.FAN.STD);
      k_matrix[0][ast_node.depth] = or;

      //
      // connect K0 on surface and Kn
      //
      for (let l = 0; l < ast_node.depth; l++)
	 k_matrix[0][l] = childCircuit.k_matrix[0][l];

      for (let k = 1; k < childCircuit.k_matrix.length; k++)
	 k_matrix[k] = ccutils.get_k_list_child(ast_node, ast.Abort, childCircuit, k);

      let kill_list = ccutils.killListChildren(ast_node, ast.Abort, [childCircuit]);

      return new Circuit(ast_node, ast.Abort, go_list, and1,
			   childCircuit.susp, kill_list, childCircuit.sel,
			   k_matrix);
   }

   if( !force_non_immediate && ast_node.immediate ) {
      return makeIfCircuit( env,
			    ast_node, 
			    [ makeNothingCircuit( env, ast_node ), 
			      makeAbortInner( env, ast_node, childCircuit )] );
   } else {
      return makeAbortInner( env, ast_node, childCircuit );
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Emit ...                                           */
/*---------------------------------------------------------------------*/
ast.Emit.prototype.makeCircuit = function( env ) {
   this.circuit = makeEmitCircuit( env, this );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeEmit ...                                                     */
/*---------------------------------------------------------------------*/
function makeEmitCircuit( env, ast_node ) {
   
   function makeEmitInnerCircuit( env, ast_node, signame ) {
      let go_list = [];
      let k_matrix = [[]];

      for( let i = 0; i <= ast_node.depth; i++ ) {
	 let go = net.makeOr( ast_node, ast.Emit, signame + "_go", i );
	 let sig = getSignalObject( env, signame, ast_node );
	 let sig_gate = signalGate( sig, i );

	 go.connectTo( sig_gate, net.FAN.STD );
	 go_list[i] = go;

	 // Special case for exec
	 if( ast_node instanceof ast.Exec ) {
	    k_matrix[ 0 ][ i ] = go;
	    ast_node.signal = sig;
	    let exec_emission_func = function() {
	       sig.set_value( ast_node.exec_status.value, i, ast_node.loc );
	       ast_node.exec_status.value = undefined;
	    }

	    let anet = new net.ActionNet(
	       ast_node, ast.Emit, "_exec_return_sig",
	       i, exec_emission_func, [] );
	    
	    go.connectTo( anet, net.FAN.STD );
	 } else {
	    // Warning: the key must be signame and *not* sig.name, in
	    // case of bouded signals.
	    ast_node.signal_map[ signame ] = sig;

	    if( ast_node.func || ast_node.accessor_list.length > 0 ) {
	       bindSigAccessorList( env, ast_node.accessor_list, ast_node );
	       let expr = new net.SignalExpressionNet(
		  ast_node, ast.Emit, sig, signame + "_signal_expr", i,
		  ast_node.func, ast_node.accessor_list );
	       go.connectTo( expr, net.FAN.STD );
	       k_matrix[ 0 ][ i ] = expr;
	    } else {
	       k_matrix[ 0 ][ i ] = go;
	    }
	 }
      }

      return new Circuit( ast_node, ast.Emit, go_list, null, null, null,
			  null, k_matrix );
   }

   function makeEmitIfCircuit( env, ast_node ) {
      let emit_node;

      if( ast_node.signame_list.length === 1 ) {
	 emit_node = makeEmitInnerCircuit( 
	    env, ast_node, ast_node.signame_list[ 0 ] );
      } else {
	 emit_node = makeSequenceCircuit( 
	    env, ast_node, ast_node.signame_list.map(
	       function( el, i, arr ) {
		  return makeEmitInnerCircuit( env, ast_node, el );
	       }));
      }

      //
      // That burn the eyes and it will probably broke one day, but it
      // allows to keep the intermediate representation like the source
      // code, therefore, it makes easier the debugging of HH when use
      // pretty-printer/debugger...
      //
      // Basically, we build a dummy If AST node, giving it if_func and
      // if_accessor_list of the Emit node, to be able to build a if
      // circuit, with the emit in then branch.
      //
      if( ast_node.if_func ) {
	 let if_circuit;
	 let nothing_circuit;
	 let if_ast = new ast.If( "IF", undefined, ast_node.loc, 
				  true, [], false,
				  ast_node.if_func, ast_node.if_accessor_list );

	 if_ast.machine = ast_node.machine;
	 if_ast.depth = ast_node.depth;
	 nothing_circuit = makeNothingCircuit( if_ast, ast_node );
	 if_circuit = makeIfCircuit( env, if_ast, [ emit_node, nothing_circuit ] );

	 return if_circuit;
      }

      return emit_node;
   }
   
   if( ast_node instanceof ast.Exec ) {
      return makeEmitInnerCircuit( env, ast_node, ast_node.signame ); 
   } else {
      return makeEmitIfCircuit( env, ast_node );
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sustain ...                                        */
/*---------------------------------------------------------------------*/
ast.Sustain.prototype.makeCircuit = function( env ) {
   const cpause = makePauseCircuit( env, this );
   const cemit = makeEmitCircuit( env , this );
   const cseq = makeSequenceCircuit( env, this, [ cemit, cpause] );
   this.circuit = makeLoopCircuit( env, this, cseq );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::If ...                                             */
/*---------------------------------------------------------------------*/
ast.If.prototype.makeCircuit = function( env ) {
   const cc0 = this.children[ 0 ].makeCircuit( env );
   const cc1 = this.children[ 1 ].makeCircuit( env );
   this.circuit = makeIfCircuit( env, this, [ cc0, cc1 ] );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeIfCircuit ...                                                */
/*---------------------------------------------------------------------*/
function makeIfCircuit( env, ast_node, childCircuits ) {
   let go_list = [];
   let sel = null;

   for( let i = 0; i <= ast_node.depth; i++ ) {
      let go = net.makeOr( ast_node, ast.If, "go", i );
      let and_then = net.makeAnd( ast_node, ast.If, "and_then", i );
      let and_else = net.makeAnd( ast_node, ast.If, "and_else", i );

      if( ast_node.not ) {
 	 makeExpressionNet( env, ast_node, ast.If, [go], [and_else], [and_then], i );
      } else {
	 makeExpressionNet( env, ast_node, ast.If, [go], [and_then], [and_else], i );
      }

      go.connectTo( and_then, net.FAN.STD );
      go.connectTo( and_else, net.FAN.STD );

      and_then.connectTo( childCircuits[0].go_list[i], net.FAN.STD );
      and_else.connectTo( childCircuits[1].go_list[i], net.FAN.STD );

      go_list[ i ] = go;
   }

   for( let i = childCircuits.length - 1; i >= 0; i-- ) {
      if( childCircuits[ i ].sel ) {
	 if( !sel ) {
	    sel = net.makeOr( ast_node, ast.If, "sel" );
	 }
	 childCircuits[ i ].sel.connectTo( sel, net.FAN.STD );
      }
   }

   //
   // get RES of children
   //
   let res = ccutils.get_res_children( ast_node, ast.If, childCircuits );

   //
   // get SUSP of children
   //
   let susp = ccutils.get_susp_children( ast_node, ast.If, childCircuits );

   //
   // get KILL list of children
   //
   let kill_list = ccutils.killListChildren( ast_node, ast.If, childCircuits );

   //
   // get Kn list of children, make union of then
   //
   let k_matrix = [];
   let k_matrix_then = childCircuits[0].k_matrix;
   let k_matrix_else = childCircuits[1].k_matrix;
   let max_k = Math.max(k_matrix_then.length, k_matrix_else.length) - 1;
   for (let ki = 0; ki <= max_k; ki++) {
      let k_list_then = ccutils.get_k_list_child(ast_node, ast.If,
					 childCircuits[0], ki);
      let k_list_else = ccutils.get_k_list_child(ast_node, ast.If,
					 childCircuits[1], ki);
      k_matrix[ki] = [];
      for (let kl = 0; kl <= ast_node.depth; kl++) {
	 let union = net.makeOr(ast_node, ast.If, "k", + ki + "_union_buffer",
				 ki);
	 k_matrix[ki][kl] = union;
	 if (k_list_then[kl]) {
	    k_list_then[kl].connectTo(union, net.FAN.STD);
	 }
	 if (k_list_else[kl]) {
	    k_list_else[kl].connectTo(union, net.FAN.STD);
	 }
      }
   }

   return new Circuit(ast_node, ast.If, go_list, res, susp, kill_list, sel,
			k_matrix);
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Halt ...                                           */
/*---------------------------------------------------------------------*/
ast.Halt.prototype.makeCircuit = function( env ) {
   this.circuit = makeHaltCircuit( this, this );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeHaltCircuit ...                                              */
/*---------------------------------------------------------------------*/
function makeHaltCircuit( env, ast_node ) {
   return makeLoopCircuit( env, ast_node, makePauseCircuit( env, ast_node ) );
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Exec ...                                           */
/*---------------------------------------------------------------------*/
ast.Exec.prototype.makeCircuit = function( env ) {
   let exec_status = {
      id: undefined,
      value: undefined,
      active: false,
      prev_active: false,
      kill: false,
      prev_killed: false,
      suspended: false,
      prev_suspended: false,
      start: false,
      astNode: this,

      // abort of await use this wire instead of signal wire to know
      // when user routine is done
      callback_wire: net.makeOr(this, ast.Exec, "callback_wire"),

      func_start: this.func,
      func_susp: this.func_susp,
      func_kill: this.func_kill,
      func_res: this.func_res
   };
   exec_status.callback_wire.noSweep = true;
   this.machine.exec_status_list.push(exec_status);

   //
   // needed for particular case in Abort (via this nested Await
   // instruction) and Emit
   //
   this.exec_status = exec_status;

   //
   // make_await/sequence/emit take account of incarnation levels
   //
   let await_node = makeAwaitCircuit( env, this );

   for(let l = 0; l <= this.depth; l++) {
      let start = new net.ActionNet(
	 this, ast.Exec, "start", l, function() {
   	 exec_status.start = true;
	 exec_status.lvl = l;
      }, [] );
      await_node.go_list[l].connectTo(start, net.FAN.STD);

      let kill = new net.ActionNet(
	 this, ast.Exec, "kill", l, function() { 
	    exec_status.kill = true; 
	 }, [] );
      await_node.kill_list[l].connectTo(start, net.FAN.NEG);
      await_node.kill_list[l].connectTo(kill, net.FAN.STD);

      //
      // kill handler must be called in case of abortion
      //
      let andDetectAbort = new net.ActionNet(
	 this, ast.Exec, "abort", l, function() {
	    exec_status.kill = true;
	 }, [] );
      await_node.res.connectTo(andDetectAbort, net.FAN.NEG);
      await_node.susp.connectTo(andDetectAbort, net.FAN.NEG);
      await_node.sel.connectTo(andDetectAbort, net.FAN.STD);

      let susp = new net.ActionNet(
	 this, ast.Exec, "susp", l, function() {
   	    exec_status.suspended = true;
	 }, [] );
      await_node.susp.connectTo(susp, net.FAN.STD);
      await_node.sel.connectTo(susp, net.FAN.STD);

      let res = new net.ActionNet(
	 this, ast.Exec, "res", l, function() {
   	    exec_status.suspended = false;
	 }, [] );
      await_node.res.connectTo(res, net.FAN.STD);
      await_node.sel.connectTo(res, net.FAN.STD);

      bindSigAccessorList( env, this.accessor_list, this );
      signal.runtimeSignalAccessor( this, this.accessor_list, l );
   }

   if( this.signame ) {
      const cemit = makeEmitCircuit( env, this );
      this.circuit = makeSequenceCircuit( env, this, [ await_node, cemit ] );
   } else {
      this.circuit = await_node;
   }
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Run ...                                            */
/*---------------------------------------------------------------------*/
ast.Run.prototype.makeCircuit = function( env ) {
   linkSigDeclList( env, this.sigDeclList, this );

   let nenv = this.sigDeclList.filter( s => s.signal );
   this.circuit = this.children[ 0 ].makeCircuit( nenv );
   
   linkNode( this );
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Local ...                                          */
/*---------------------------------------------------------------------*/
ast.Local.prototype.makeCircuit = function( env ) {
   let sig;
   let go_list = [];
   let child = this.children[ 0 ];
   let res = net.makeOr( this, ast.Local, "res_buf" );

   //
   // As child circuit can use signal declared in this local, we need to
   // build them first. As we don't know yet if the child circuit uses
   // k1, kill or susp, we have to use buffers...
   //
   let k_matrix = [ [], [] ];
   let kill_list = [];
   let susp = net.makeOr( this, ast.Local, "susp_buf" );
   let initList = [];

   for( let i = 0; i <= this.depth; i++ ) {
      k_matrix[ 1 ][ i ] = net.makeOr( this, ast.Local, "k1_output_buffer", i );
      kill_list[ i ] = net.makeOr( this, ast.Local, "kill_output_buffer", i );
      go_list[ i ] = net.makeOr( this, ast.Local, "go", i );
   }

   // Generation of signal in the Local scope.  For now, Only 
   // unbound signals are created, and `accessibility` is ignored.
   this.sigDeclList.forEach( sigprop => {
      if( !sigprop.alias ) {
	 let s = new signal.Signal( this, sigprop, ast.Local, k_matrix[ 1 ],
				    kill_list, susp );

	 sigprop.signal = s;
	 this.machine.local_signal_list.push( s );

	 //
	 // Reinstantiation of local signal. Involves the call to
	 // reset function and the call of init function (which has
	 // dependencies). Same of reinit (happens on RES, or GO if no
	 // init provided).
	 //
	 for( let l = 0; l <= this.depth; l++ ) {
	    bindSigAccessorList( env, s.init_accessor_list, this );
	    let action_init = new net.ActionNet(
	       this, ast.Local, "init", l, function() {
		  signal.create_scope.call(
		     this, s, l);
	       }, s.init_accessor_list );
	    go_list[ l ].connectTo( action_init, net.FAN.STD );
	    initList.push( action_init );

	    bindSigAccessorList( env, s.reinit_accessor_list, this );
	    let action_reinit = new net.ActionNet(
	       this, ast.Local, "reinit", l, function() {
		  signal.resume_scope.call(
		     this, s, l);
	       }, s.reinit_accessor_list );
	    res.connectTo(action_reinit, net.FAN.STD);
	 }
      } else {
	 //
	 // The signal is aliased. Hence, we have to reference the
	 // signal attribute of the signal property to the signal
	 // object. This attribute is empty when the signal property
	 // comes from module used in a run statement.
	 //
	 if( !sigprop.signal ) {
	    sigprop.signal = getSignalObject( env, sigprop.alias, this );
	 }
      }
   } );

   // Child circuit makeeration and connexion
   child.makeCircuit( env.concat( this.sigDeclList ) );

   //
   // Connect kill_list buffers to nested kill_list buffers
   //
   let nestedKillList = ccutils.killListChildren( this, ast.Local, [ child.circuit ] );
   if( nestedKillList ) {
      for( let k in kill_list ) {
	 kill_list[ k ].connectTo( nestedKillList[ k ], net.FAN.STD );
      }
   }

   //
   // connect child circuit to buffers res, k1, kill and susp
   //
   if( child.circuit.res ) {
      res.connectTo( child.circuit.res, net.FAN.STD );
   }

   if( child.circuit.susp ) {
      susp.connectTo( child.circuit.susp, net.FAN.STD );
   }

   k_matrix[ 0 ] = ccutils.get_k_list_child( this, ast.Local, child.circuit, 0 );
   for( let i = 2; i < child.circuit.k_matrix.length; i++ ) {
      k_matrix[i] = ccutils.get_k_list_child(this, ast.Local, child.circuit, i)
   }

   for( let i in child.circuit.k_matrix[ 1 ] ) {
      let lvl = i > this.depth ? this.depth : i;
      child.circuit.k_matrix[1][i].connectTo( 
	 k_matrix[ 1 ][ lvl ], net.FAN.STD);
   }

   //
   // connect go to child
   //
   // Actually, signal initialization net (if exists) is connected to
   // child, this ensure that local signal is initialized before
   // starting the body.
   //
   // Another possibilitie would be to add the initialization net to
   // the dependency list of the signal, but it may lead to cycle
   // error (making an embed emission to depends of the go, but also
   // the local k0 depends of the emission...)
   //
   for( let l = 0; l <= this.depth; l++ ) {
      let go = initList[ l ] ? initList[ l ] : go_list[ l ];
      go.connectTo( child.circuit.go_list[ l ], net.FAN.STD );
   }

   this.circuit = new Circuit( this, ast.Local, go_list, res, susp,
			       kill_list, child.circuit.sel, k_matrix );
   linkNode( this );
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Module ...                                         */
/*---------------------------------------------------------------------*/
ast.Module.prototype.makeCircuit = function( env ) {
   let boot_reg = new net.RegisterNet(this, ast.Module, "global_boot_register");
   let const0 = net.makeOr(this, ast.Module, "global_const0");
   
   const0.noSweep = true;

   //
   // It's mandatory that `boot_reg` propagate BEFORE `const0` the
   // first reaction. It's OK with current known list, but keep that
   // in mind. (we also count make a dependency of `boot_reg` to
   // `const0`?)
   //
   const0.connectTo( boot_reg, net.FAN.STD );
   this.machine.boot_reg = boot_reg;

   //
   // Generation of global signal
   //
   let signalsReady = net.makeOr( this, ast.Module, "global_signals_ready" );
   boot_reg.connectTo( signalsReady, net.FAN.STD );
   
   // nenv must be constructed incrementally in order to support 
   // initialization dependencies
   let nenv = env;
   
   for (let i in this.sigDeclList) {
      let sigdecl = this.sigDeclList[i];
      let s = new signal.Signal(this, sigdecl, ast.Module);

      nenv.push( sigdecl );
      
      if (sigdecl.accessibility == lang.IN ||
	  sigdecl.accessibility == lang.INOUT) {
	 this.machine.input_signal_map[s.name] = s;

	 //
	 // This is a bit hacky, but it allows to known from the
	 // reactive machine net list if this net is the one of a
	 // global input signal.
	 //
	 // This is important to fill the known list at the beginning
	 // of the reaction: is the net is from an global input
	 // signal, then it must check if the signal has been emitted
	 // by the environment. If it is, the net must be added in the
	 // known list.
	 //
	 // It is quicker and simpler than iterate on the
	 // input_signal_map (which was previously done).
	 //
	 s.gate_list[0].isGlobalInputSignalNet = true;
	 s.gate_list[0].signal = s;
      }

      if (sigdecl.accessibility == lang.OUT ||
	  sigdecl.accessibility == lang.INOUT) {
	 this.machine.output_signal_map[s.name] = s;
      }
      this.machine.global_signal_map[s.name] = s;
      //
      // Signal reinitialization overrides if exists signal
      // initialization.
      //
      if( s.reinit_func ) {
	 bindSigAccessorList( env, s.reinit_accessor_list, this );
	 let action_reinit = new net.ActionNet(
	    this, ast.Module, "reinit", 0, function() {
	       signal.resume_scope.call(this, s);
	    }, s.reinit_accessor_list );
	 const0.connectTo(action_reinit, net.FAN.NEG);
	 action_reinit.connectTo(signalsReady, net.FAN.DEP);
      } else if( s.init_func ) {
	 bindSigAccessorList( env, s.init_accessor_list, this );
	 let action_init = new net.ActionNet(
	    this, ast.Module, "init", 0, function() {
	       signal.create_scope.call(this, s, 0);
	    }, s.init_accessor_list);
	 boot_reg.connectTo(action_init, net.FAN.STD);
	 action_init.connectTo(signalsReady, net.FAN.DEP);
      }
   }

   // compile the whole module
//   let nenv = env.concat( this.sigDeclList );
   this.children.forEach( c => c.makeCircuit( nenv ) );

   // last children is the reactive program code
   let child = this.children[ this.children.length - 1 ];
   let list = null;

   // signals connections
   signalsReady.connectTo( child.circuit.go_list[ 0 ], net.FAN.STD );
   if( child.circuit.res ) {
      boot_reg.connectTo( child.circuit.res, net.FAN.NEG );
   }

   if( child.circuit.kill && child.circuit.kill[ 0 ] ) {
      const0.connectTo( child.circuit.kill[ i ], net.FAN.STD );
   }

   if( child.circuit.susp ) {
      const0.connectTo( child.circuit.susp, net.FAN.STD );
   }

   // Connect sel, K0 (level 0) and K1 (level 0)
   this.machine.sel = child.circuit.sel;
   if( child.circuit.k_matrix[ 0 ] ) {
      let i0 = child.circuit.k_matrix[ 0 ][ 0 ];
      let i1 = child.circuit.k_matrix[ 0 ][ 1 ];

      this.machine.k0 = net.makeOr( this, ast.Module, "global_k0" );
      
      if( i0 ) i0.connectTo( this.machine.k0, net.FAN.STD );
      if( i1 ) i1.connectTo( this.machine.k0, net.FAN.STD );
   }
   
   if( child.circuit.k_matrix[ 1 ] ) {
      let i0 = child.circuit.k_matrix[ 1 ][ 0 ];
      let i1 = child.circuit.k_matrix[ 1 ][ 1 ];

      this.machine.k1 = net.makeOr( this, ast.Module, "global_k1" );
      if( i0 ) i0.connectTo( this.machine.k1, net.FAN.STD );
      if( i1 ) i1.connectTo( this.machine.k1, net.FAN.STD );
   }

   // Useless for the runtime, but simplify the design of the debugger.
   let res = net.makeOr( this, ast.Module, "global_res_for_debug" );
   boot_reg.connectTo( res, net.FAN.NEG );
   this.circuit = new Circuit( this, ast.Module, [boot_reg], res, const0,
			       [const0], this.machine.sel,
			       [[this.machine.k0], [this.machine.k1]] );
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile( machine, ast_node ) {
   machine.nets = [];
   machine.input_signal_map = {};
   machine.output_signal_map = {};
   machine.local_signal_list = [];

   // Elaboration and linking stage
   ast_node.acceptAuto( new ccutils.InitVisitor( machine ) );
   ast_node.accept( new ccutils.SignalVisitor( machine ) );
   ast_node.accept( new ccutils.TrapVisitor() );

   ast.computeNodeRegisterId( ast_node, "0" );
   ast.computeNodeDepth( ast_node, 1, false, false );
   
   ast_node.makeCircuit( [] );

   machine.nets.forEach( net => net.reset( true ) );
   
   machine.boot_reg.value = true;
   if( machine.sweep ) require( "./sweep.js" ).sweep( machine );
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.compile = compile;


