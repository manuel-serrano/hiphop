/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/ast.js                    */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 18:04:46 2018                          */
/*    Last change :  Sat Sep 29 02:52:55 2018 (serrano)                */
/*    Copyright   :  2018 serrano                                      */
/*    -------------------------------------------------------------    */
/*    HipHop ast representation                                        */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
const error = require("./error.js");
const lang = require("./lang.js");

/*---------------------------------------------------------------------*/
/*    ASTNode ...                                                      */
/*---------------------------------------------------------------------*/
class ASTNode {
   constructor( tag, id, loc, nodebug, children ) {
      if( !children ) {
	 children = [];
      } else if( children instanceof ASTNode ) {
	 children = [ children ];
      } else if( !(children instanceof Array) ) {
	 throw new TypeError( tag + ": bad form", loc );
      }

      this.tag = tag;
      this.loc = loc;
      this.machine = null;
      this.children = children;
      this.depth = 0;
      this.id = id;

      //
      // unset here, use in compiler to store circuit interface on make
      // circuit phase, and connect on others circuit on connect circuit
      // phase
      //
      this.cinterface = null;
      this.net_list = [];

      //
      // Fields used to give a stable id on register that can be created
      // when translating this ast node. Each times a registed is created
      // inside this node, we assign as unique id the value "" +
      // this.instr_depth + this.instr_seq + this.next_register_id++
      //
      this.instr_seq = 0;
      this.next_register_id = 0;

      //
      // Tell if the branch is dynamically added since last compilation
      // and if this branch is embedded on a selected parallel. If true
      // the compiler can add a one shot register to 1. Nobody should
      // refers to this variable: the compiler will override it after the
      // compilation that will follow appendChild()
      //
      this.dynamic = false;

      //
      // Tell the debugger / pretty printer of the program to not display
      // this instruction. If children exists, they will be displayed.
      //
      this.nodebug = nodebug ? true : false;
   }
   
   accept( visitor ) {
      visitor.visit( this );
   }

   accept_auto( visitor ) {
      visitor.visit( this );
      this.children.forEach( c => c.accept_auto( visitor ) );
   }

   clone() {
      throw new error.InternalError( "`clone` must be implemented", this.loc );
   }

   clone_children() {
      return this.children.map( c => c.clone() );
   }
}

/*---------------------------------------------------------------------*/
/*    ActionNode ...                                                   */
/*---------------------------------------------------------------------*/
class ActionNode extends ASTNode {
   constructor( tag, id, loc, nodebug, children, func, accessor_list ) {
      super( tag, id, loc, nodebug, children );

      this.func = func;
      this.accessor_list = accessor_list;
   }
}

/*---------------------------------------------------------------------*/
/*    ExpressionNode ...                                               */
/*---------------------------------------------------------------------*/
class ExpressionNode extends ActionNode {
   constructor( tag, id, loc, nodebug, children, func, accessor_list, immediate ) {
      super( tag, id, loc, nodebug, children, func, accessor_list );

      this.immediate = immediate;
   }
}

/*---------------------------------------------------------------------*/
/*    CountExpressionNode ...                                          */
/*---------------------------------------------------------------------*/
class CountExpressionNode extends ExpressionNode {
   constructor( tag, id, loc, nodebug, children, func, accessor_list,
		immediate, func_count, accessor_list_count ) {
      super( tag, id, loc, nodebug, children, func, accessor_list, immediate);

      this.func_count = func_count;
      this.accessor_list_count = accessor_list_count;
   }
}

/*---------------------------------------------------------------------*/
/*    Emit ...                                                         */
/*---------------------------------------------------------------------*/
class Emit extends ActionNode {
   constructor( tag, id, loc, nodebug,
		signame_list, func, accessor_list, if_func,
		if_accessor_list ) {
      super( tag, id, loc, nodebug, undefined, func, accessor_list );
      
      //
      // signame_list does not need to be cloned when the AST is
      // cloned since it is never modified.
      //
      this.signame_list = signame_list;
      this.if_func = if_func;
      this.if_accessor_list = if_accessor_list;
      //
      // Signal objects of emitted signal. Used by debugger. Not clone!
      //
      this.signal_map = {};
   }
   
   clone() {
      return new Emit( this.tag, this.id, this.loc, this.nodebug, 
		       this.signame_list,
		       this.func, clone_list( this.accessor_list ),
		       this.if_func, clone_list( this.if_accessor_list ) );
   }
}

/*---------------------------------------------------------------------*/
/*    Sustain ...                                                      */
/*---------------------------------------------------------------------*/
class Sustain extends Emit {
   constructor( id, loc, nodebug, signame_list, func, accessor_list,
		 if_func, if_accessor_list ) {
      super( id, "SUSTAIN", loc,
	     nodebug, signame_list, func, accessor_list,
	     if_func, if_accessor_list );
   }
   
   clone() {
      return new Sustain( this.id, this.loc, this.nodebug, 
			  this.signame_list,
			  this.func, clone_list( this.accessor_list ),
			  this.if_func, clone_list( this.if_accessor_list ) );
   }
}

/*---------------------------------------------------------------------*/
/*    Nothing ...                                                      */
/*---------------------------------------------------------------------*/
class Nothing extends ASTNode {
   constructor( id, loc, nodebug ) {
      super( "NOTHING", id, loc, nodebug, undefined );
   }
   
   clone() {
      return new Nothing( this.id, this.loc, this.nodebug );
   }
}

/*---------------------------------------------------------------------*/
/*    Pause ...                                                        */
/*---------------------------------------------------------------------*/
class Pause extends ASTNode {
   constructor( id, loc, nodebug ) {
      super( "PAUSE", id, loc, nodebug, undefined );
   }
   
   clone() {
      return new Pause( this.id, this.loc, this.nodebug );
   }
}

/*---------------------------------------------------------------------*/
/*    Trap ...                                                         */
/*---------------------------------------------------------------------*/
class Trap extends ASTNode {
   constructor( id, loc, nodebug, trap_name, children ) {
      super( "TRAP", id, loc, nodebug, children );
      this.trap_name = trap_name;
   }
   
   clone() {
      return new Trap( this.id, this.loc, this.nodebug, this.trap_name,
		       this.clone_children() );
   }
}

/*---------------------------------------------------------------------*/
/*    Exit ...                                                         */
/*---------------------------------------------------------------------*/
class Exit extends ASTNode {
   constructor( id, loc, nodebug, trap_name ) {
      super( "EXIT", id, loc, nodebug, undefined );
      this.trap_name = trap_name;
      this.return_code = 2;
   }
   
   clone() {
      return new Exit( this.id, this.loc, this.nodebug, this.trap_name );
   }
}

/*---------------------------------------------------------------------*/
/*    Halt ...                                                         */
/*---------------------------------------------------------------------*/
class Halt extends ASTNode {
   constructor( id, loc, nodebug ) {
      super( "HALT", id, loc, nodebug, undefined );
   }
   
   clone() {
      return new Halt( this.id, this.loc, this.nodebug );
   }
}

/*---------------------------------------------------------------------*/
/*    Atom ...                                                         */
/*---------------------------------------------------------------------*/
class Atom extends ActionNode {
   constructor( tag, id, loc, nodebug, func, accessor_list ) {
      super( tag, id, loc, nodebug, undefined, func, accessor_list );
   }
   
   clone() {
      return new Atom( this.tag, this.id, this.loc, this.nodebug, this.func,
		       clone_list( this.accessor_list ) );
   }
}

/*---------------------------------------------------------------------*/
/*    Await ...                                                        */
/*---------------------------------------------------------------------*/
class Await extends CountExpressionNode {
   constructor( tag, id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count ) {
      super( tag, id, loc,
	     nodebug, undefined, func,
	     accessor_list, immediate, func_count,
	     accessor_list_count );
   }
   
   clone() {
      return new Await( this.tag, this.id, this.loc, this.nodebug, this.func,
			clone_list( this.accessor_list ),
			this.immediate, this.func_count,
			clone_list( this.accessor_list_count ) );
   }
}

/*---------------------------------------------------------------------*/
/*    Module ...                                                       */
/*---------------------------------------------------------------------*/
class Module extends ASTNode {
   constructor( id, loc, name, sigdecllist, children ) {
      super( "MODULE", id, loc, false, children );
      this.sigDeclList = sigdecllist;
      this.module_instance_id = null;
      this.name = name;
   }

   clone() {
      return new Module( this.id, this.loc, this.name,
			 clone_list( this.sigDeclList ),
			 this.clone_children() );
   }
}

/*---------------------------------------------------------------------*/
/*    Abort ...                                                        */
/*---------------------------------------------------------------------*/
class Abort extends CountExpressionNode {
   constructor( id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count, children ) {
      super( "ABORT", id, loc,
	     nodebug, children, func,
	     accessor_list, immediate, func_count,
	     accessor_list_count );
   }

   clone() {
      return new Abort( this.id, this.loc, this.nodebug, this.func,
			clone_list( this.accessor_list ), this.immediate,
			this.func_count, clone_list( this.accessor_list_count ),
			this.clone_children() );
   }
}

/*---------------------------------------------------------------------*/
/*    WeakAbort ...                                                    */
/*---------------------------------------------------------------------*/
class WeakAbort extends CountExpressionNode {
   constructor( id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count, children ) {
      super( "WeakAbort", id, loc,
	     nodebug, null, func, accessor_list,
	     immediate, func_count, accessor_list_count );
      let c = new Trap( 
	 null, loc, true, "WEAKABORT_END_BODY", 
	 new Fork(null, loc, true, [
	    new Sequence( 
	       null, loc, true, [
		  new Await( null, loc, true, func, 
			     accessor_list, immediate, func_count,
			     accessor_list_count ),
		  new Exit( null, loc, true, "WEAKABORT_END_BODY" )
	       ]),
	    new Sequence( null, loc, true, children )
	 ]));
      
      this.children = c;
   }
   
   clone() {
      return new WeakAbort( this.id, this.loc, this.nodebug, this.func,
			    clone_list( this.accessor_list ), this.immediate,
			    this.func_count, clone_list( this.accessor_list_count ),
			    this.clone_children() );
   }
}

/*---------------------------------------------------------------------*/
/*    Loop ...                                                         */
/*---------------------------------------------------------------------*/
class Loop extends ASTNode {
   constructor( id, loc, nodebug, children ) {
      super( "LOOP", id, loc, nodebug, children );
   }

   clone() {
      return new Loop( this.id, this.loc, this.nodebug, this.clone_children() );
   }
}

/*---------------------------------------------------------------------*/
/*    LoopEach ...                                                     */
/*---------------------------------------------------------------------*/
class LoopEach extends CountExpressionNode {
   constructor( id, loc, nodebug, children, func, accessor_list, func_count,
		   accessor_list_count ) {
      super( "LOOPEACH", id, loc,
	     nodebug, children, func,
	     accessor_list, false, func_count,
	     accessor_list_count );
   }
   
   clone() {
      return new LoopEach( this.id, this.loc, this.nodebug, 
			   this.clone_children(),
			   this.func, clone_list( this.accessor_list ),
			   this.func_count, 
			   clone_list( this.accessor_list_count ) );
   }
}

/*---------------------------------------------------------------------*/
/*    Every ...                                                        */
/*---------------------------------------------------------------------*/
class Every extends CountExpressionNode {
   constructor( id, loc, nodebug, children, func, accessor_list, immediate,
		func_count, accessor_list_count ) {
      super( "EVERY", id, loc,
	     nodebug, children, func,
	     accessor_list, immediate, func_count,
	     accessor_list_count );
   }
   
   clone() {
      return new Every( this.id, this.loc, this.nodebug, 
			this.clone_children(),
			this.func, clone_list( this.accessor_list ), 
			this.immediate,
			this.func_count, 
			clone_list( this.accessor_list_count ) );
   }
}

/*---------------------------------------------------------------------*/
/*    Suspend ...                                                      */
/*---------------------------------------------------------------------*/
class Suspend extends ExpressionNode {
   constructor( id, loc, nodebug, children, func, accessor_list, immediate ) {
      super( "SUSPEND", id, loc,
	     nodebug, _children, func, accessor_list,
	     immediate );
      if( immediate ) {
	 let trapName = "SUSPEND_IMMEDIATE_END_BODY";
	 let _exit = new Exit(null, loc, true, trapName);
	 let _then = new Pause(null, loc, true);
	 let _else = new Sequence(null, loc, true,
				  [new Sequence(null, loc, true, children),
				   new Exit(null, loc, true, trapName)]);
	 let _if = new If(null, loc, true, [_then, _else], false,
			  func, accessor_list);
	 let _loop = new Loop(null, loc, true, _if);
	 this.children = new Trap(null, loc, true, trapName, _loop);
      } else {
	 this.children = children;
      }
   }

   clone() {
      return new Suspend( this.id, this.loc, this.nodebug, 
			  this.clone_children(),
			  this.func, clone_list( this.accessor_list ),
			  this.immediate );
   }
}

/*---------------------------------------------------------------------*/
/*    Fork ...                                                         */
/*---------------------------------------------------------------------*/
class Fork extends ASTNode {
   constructor( id, loc, nodebug, children ) {
      super( "FORK", id, loc, nodebug, children );
   }

   clone() {
      return new Fork( this.id, this.loc, this.nodebug, this.clone_children() );
   }

   appendChild( ast_node, oneshot_reg=true ) {
      if (!(ast_node instanceof ASTNode))
	 throw new SyntaxError("Child is not an Hiphop.js instruction",
			       this.loc);

      if (ast_node instanceof Module)
	 throw new SyntaxError("Child can't be a Module.",
			       + " (you may want use RUN?)", this.loc);

      this.machine.update(() => {
	 //
	 // Check if there is a selected register in parallel children: only
	 // check the sel gate of the parallel is wrong if the parallel was
	 // started at the previous reaction (sel is not yet propagated).
	 //
	 // See tests/run-add-par.js
	 //
	 let sel = (function check_sel(ast_node) {
	    if (ast_node.cinterface &&
   		ast_node.cinterface.sel &&
   		ast_node.cinterface.sel.value == true)
   	       return true;
	    for (let i in ast_node.children)
   	       if (check_sel(ast_node.children[i]))
   		  return true;
	    return false;
	 })(this);

	 this.children.push(ast_node);
	 this.machine.needCompile = true;

	 if( sel && oneshot_reg == true ) {
	    ast_node.dynamic = true;
	 }
      });
   }

   removeChild( ast_node ) {
      this.machine.update(() => {
	 //
	 // We replace the removed branch by a nothing branch. Otherwise,
	 // it could be a shift in the unique stable id of registers, and
	 // restoration can restore values to wrong registers
	 //
	 let index = this.children.indexOf(ast_node);

	 if( index > -1 ) {
	    this.children[ index ] = 
	       new Nothing( null, this.children[index].loc, true );
	    this.machine.needCompile = true;
	 }
      });
   }
}

/*---------------------------------------------------------------------*/
/*    If ...                                                           */
/*---------------------------------------------------------------------*/
class If extends ExpressionNode {
   constructor( id, loc, nodebug, children, not, func, accessor_list ) {
      super( "IF", id, loc, nodebug, children, func, accessor_list, false );
      
      if( children[ 1 ] === undefined ) {
	 children[ 1 ] = new Nothing( null, loc, false );
      }

      this.not = not;
   }

   clone() {
      return new If( this.id, this.loc, this.nodebug, this.clone_children(),
		     this.not, this.func, clone_list(this.accessor_list) );
   }
}

/*---------------------------------------------------------------------*/
/*    SEQUENCE ...                                                     */
/*---------------------------------------------------------------------*/
class Sequence extends ASTNode {
   constructor( id, loc, nodebug, children ) {
      super( "SEQUENCE", id, loc, nodebug, children );
   }

   clone() {
      return new Sequence( this.id, this.loc, this.nodebug, 
			   this.clone_children() );
   }
}

/*---------------------------------------------------------------------*/
/*    RUN ...                                                          */
/*---------------------------------------------------------------------*/
class Run extends ASTNode {
   constructor( id, loc, name, nodebug, sigdecllist, body ) {
      super( "RUN", id, loc, nodebug, body );
      this.module_instance_id = null;
      this.name = name;
      this.sigDeclList = sigdecllist;
   }
   
   clone() {
      return new Run( this.id, this.loc, this.name, this.nodebug,
		      this.clone_children() );
   }
}

/*---------------------------------------------------------------------*/
/*    Local ...                                                        */
/*---------------------------------------------------------------------*/
class Local extends ASTNode {
   constructor( id, loc, nodebug, sigdecllist, children ) {
      super( "LOCAL", id, loc, nodebug, children );
      this.sigDeclList = sigdecllist;
      //
      // Tell if the Local is a child of a RUN intruction. Used for
      // debugger.
      //
      this.in_run_context = false;
      this.module_instance_id = null; // always null if not in run context.
   }
   
   //
   // sigdecllist must not be cloned if the Local instruction
   // is from a run_context: in that case, the list is already cloned
   // before, in the RUN construct builder.
   //
   clone() {
      let clone = new Local( this.id, this.loc, this.nodebug,
			     (this.in_run_context ?
			      this.sigDeclList :
			      clone_list( this.sigDeclList )),
			     this.clone_children() );
      clone.in_run_context = this.in_run_context;
      return clone;
   }
}

/*---------------------------------------------------------------------*/
/*    Exec ...                                                         */
/*---------------------------------------------------------------------*/
class Exec extends ASTNode {
   constructor( id, loc, nodebug, signame, func_start,
		func_start_accessor_list, func_res, func_susp, func_kill ) {
      super( "EXEC", id, loc, nodebug, undefined );
      this.func = func_start;
      this.accessor_list = func_start_accessor_list;
      this.func_res = func_res;
      this.func_susp = func_susp;
      this.func_kill = func_kill;
      this.signame = signame;

      //
      // If signal is present, this is the signal object emitted when
      // exec returns. (not the implicit signal for bookkeeping). Used by
      // debugger. Not clone!
      //
      this.signal = null;
   }

   clone() {
      return new Exec( this.id, this.loc, this.nodebug, 
		       this.signame, this.func,
		       clone_list( this.accessor_list ), this.func_res,
		       this.func_susp, this.func_kill );
   }
}

/*---------------------------------------------------------------------*/
/*    SignalAccessor ...                                               */
/*    -------------------------------------------------------------    */
/*    Signal accessors. Exports for building them in lang.hs           */
/*---------------------------------------------------------------------*/
class SignalAccessor {
   constructor( signame, get_pre, get_value, is_cnt ) {
      this.signame = signame;
      this.get_pre = get_pre;
      this.get_value = get_value;
      this.is_counter = is_cnt;
   }

   clone() {
      return new SignalAccessor(
	 this.signame, this.get_pre, this.get_value, this.type );
   }
}

/*---------------------------------------------------------------------*/
/*    SignalProperties ...                                             */
/*    -------------------------------------------------------------    */
/*    Properties of a signal. Exports for building them in lang.js     */
/*---------------------------------------------------------------------*/
class SignalProperties {
   constructor( id, loc, name, dir = lang.INOUT,
		init_func, init_accessor_list,
		reinit_func, reinit_accessor_list, combine, alias ) {
      this.id = id;
      this.name = name;
      this.loc = loc;
      this.accessibility = dir;
      this.init_func = init_func;
      this.init_accessor_list = init_accessor_list;
      this.reinit_func = reinit_func;
      this.reinit_accessor_list = reinit_accessor_list;
      this.combine_func = combine;
      this.alias = alias;
   }

   clone() {
      return new SignalProperties( this.id, this.loc, this.name,
				   this.accessibility, this.init_func,
				   clone_list( this.init_accessor_list ),
				   this.reinit_func,
				   clone_list( this.reinit_accessor_list ),
				   this.combine_func, this.alias );
   }
}

/*---------------------------------------------------------------------*/
/*    clone_list ...                                                   */
/*    -------------------------------------------------------------    */
/*    Generic function for cloning signal accessor and signal          */
/*    properties.                                                      */
/*---------------------------------------------------------------------*/
function clone_list( lst ) {
   return lst.map( (el, i, arr) => el.clone() );
}

/*---------------------------------------------------------------------*/
/*    computeNodeRegisterId ...                                        */
/*---------------------------------------------------------------------*/
function computeNodeRegisterId( ast_node, seq ) {
   let child_seq = 0;
   
   ast_node.instr_seq = seq;
   ast_node.next_register_id = 0;

   for( let i = ast_node.children.length - 1; i >= 0; i-- ) {
      computeNodeRegisterId( ast_node.children[ i ], seq + child_seq++ );
   }
}

/*---------------------------------------------------------------------*/
/*    computeNodeDepth ...                                             */
/*---------------------------------------------------------------------*/
function computeNodeDepth( ast_node, depth, in_loop, in_par_sig ) {
   if( ast_node instanceof Loop || ast_node instanceof LoopEach ) {
      in_loop = true;
      in_par_sig = false;
   } else if (ast_node instanceof Fork || ast_node instanceof Local ) {
      in_par_sig = true;
      if( in_loop ) {
	 depth++;
	 in_loop = false;
      }
   }

   if( ast_node instanceof Module ) {
      // MS WARNING: C,a me semble curieux de dire ast_node.depth = 0 puis 
      // ensuite de descendre dans les files de ast_node avec depth > 0. 
      // Je me demande si c,a ne devrait pas etre 
      // depth = 0; ast_node.depth = depth;
      ast_node.depth = 0;
   } else {
      ast_node.depth = depth;
   }
   
   ast_node.children.forEach( (c, i, a) => { 
      computeNodeDepth( c, depth, in_loop, in_par_sig ) ;
   } );
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.ASTNode = ASTNode;
exports.ActionNode = ActionNode;
exports.ExpressionNode = ExpressionNode;
exports.CountExpressionNode = CountExpressionNode;
exports.Emit = Emit;
exports.Sustain = Sustain;
exports.Nothing = Nothing;
exports.Pause = Pause;
exports.Trap = Trap;
exports.Exit = Exit;
exports.Halt = Halt;
exports.Atom = Atom;
exports.Await = Await;
exports.Module = Module;
exports.Abort = Abort;
exports.WeakAbort = WeakAbort;
exports.Loop = Loop;
exports.LoopEach = LoopEach;
exports.Every = Every;
exports.Suspend = Suspend;
exports.Fork = Fork;
exports.If = If;
exports.Sequence = Sequence;
exports.Run = Run;
exports.Local = Local;
exports.Exec = Exec;
exports.SignalAccessor = SignalAccessor;
exports.SignalProperties = SignalProperties;

exports.computeNodeRegisterId = computeNodeRegisterId;
exports.computeNodeDepth = computeNodeDepth;
