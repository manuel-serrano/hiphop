/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/ast.js                     */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 18:04:46 2018                          */
/*    Last change :  Wed Jul 25 13:47:23 2018 (serrano)                */
/*    Copyright   :  2018 serrano                                      */
/*    -------------------------------------------------------------    */
/*    HipHop ast representation                                        */
/*=====================================================================*/
"use strict"
"use hopscript"

const st = require("./inheritance.js");
const error = require("./error.js");
const lang = require("./lang.js");

/*---------------------------------------------------------------------*/
/*    ASTNode ...                                                      */
/*---------------------------------------------------------------------*/
function ASTNode( tag, id, loc, nodebug, children ) {
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
   this.dynamically_added_in_sel = false;

   //
   // Tell the debugger / pretty printer of the program to not display
   // this instruction. If children exists, they will be displayed.
   //
   this.nodebug = nodebug ? true : false;
}

ASTNode.prototype.accept = function(visitor) {
   visitor.visit(this);
}

ASTNode.prototype.accept_auto = function(visitor) {
   visitor.visit(this);
   for (let i in this.children) {
      this.children[i].accept_auto(visitor);
   }
}

ASTNode.prototype.clone = function() {
   throw new error.InternalError("`clone` must be implemented", this.loc);
}

ASTNode.prototype.clone_children = function() {
   var cloned = [];

   for (let i in this.children)
      cloned.push(this.children[i].clone());
   return cloned;
}

function ActionNode(tag, id, loc, nodebug, children, func, accessor_list) {
   ASTNode.call(this, tag, id, loc, nodebug, children);

   this.func = func;
   this.accessor_list = accessor_list;
}
st.___DEFINE_INHERITANCE___(ASTNode, ActionNode);

//
// ExpressionNode have same attributes than ActionNode, but implements
// different compilation methods
//
function ExpressionNode(tag, id, loc, nodebug, children, func, accessor_list,
			immediate) {
   ActionNode.call(this, tag, id, loc, nodebug, children, func, accessor_list);

   this.immediate = immediate;
}
st.___DEFINE_INHERITANCE___(ActionNode, ExpressionNode);

function CountExpressionNode(tag, id, loc, nodebug, children, func, accessor_list,
			     immediate, func_count, accessor_list_count ) {
   ExpressionNode.call(this, tag, id, loc, nodebug, children, func, accessor_list,
		       immediate);

   this.func_count = func_count;
   this.accessor_list_count = accessor_list_count;
}
st.___DEFINE_INHERITANCE___(ExpressionNode, CountExpressionNode);

/*---------------------------------------------------------------------*/
/*    Emit ...                                                         */
/*---------------------------------------------------------------------*/
function Emit( id, tag, loc, nodebug,
	       signal_name_list, func, accessor_list, if_func,
	       if_accessor_list ) {
   ActionNode.call( this, tag, id, loc,
		    nodebug, undefined, func, accessor_list );
   //
   // signal_name_list does not need to be cloned when the AST is
   // cloned since it is never modified.
   //
   this.signal_name_list = signal_name_list;
   this.if_func = if_func;
   this.if_accessor_list = if_accessor_list;
   //
   // Signal objects of emitted signal. Used by debugger. Not clone!
   //
   this.signal_map = {};
}
st.___DEFINE_INHERITANCE___( ActionNode, Emit );

Emit.prototype.clone = function() {
   return new Emit(this.id, "EMIT", this.loc, this.nodebug, this.signal_name_list,
		   this.func, clone_list(this.accessor_list),
		   this.if_func, clone_list(this.if_accessor_list));
}

/*---------------------------------------------------------------------*/
/*    Sustain ...                                                      */
/*---------------------------------------------------------------------*/
function Sustain(id, loc, nodebug, signal_name_list, func, accessor_list,
		 if_func, if_accessor_list) {
   Emit.call( this, "SUSTAIN", id, loc,
	      nodebug, signal_name_list, func, accessor_list,
			if_func, if_accessor_list );
}
st.___DEFINE_INHERITANCE___(Emit, Sustain);

Sustain.prototype.clone = function() {
   return new Sustain(this.id, this.loc, this.nodebug, this.signal_name_list,
		      this.func, clone_list(this.accessor_list),
		      this.if_func, clone_list(this.if_accessor_list));
}

/*---------------------------------------------------------------------*/
/*    Nothing ...                                                      */
/*---------------------------------------------------------------------*/
function Nothing( id, loc, nodebug ) {
   ASTNode.call( this, "NOTHING", id, loc, nodebug, undefined );
}
st.___DEFINE_INHERITANCE___(ASTNode, Nothing);

Nothing.prototype.clone = function() {
   return new Nothing(this.id, this.loc, this.nodebug);
}

/*---------------------------------------------------------------------*/
/*    Pause ...                                                        */
/*---------------------------------------------------------------------*/
function Pause( id, loc, nodebug ) {
   ASTNode.call( this, "PAUSE", id, loc, nodebug, undefined );
}
st.___DEFINE_INHERITANCE___(ASTNode, Pause);

Pause.prototype.clone = function() {
   return new Pause(this.id, this.loc, this.nodebug);
}

/*---------------------------------------------------------------------*/
/*    Trap ...                                                         */
/*---------------------------------------------------------------------*/
function Trap( id, loc, nodebug, trap_name, children ) {
   ASTNode.call(this, "TRAP", id, loc, nodebug, children);
   this.trap_name = trap_name;
}
st.___DEFINE_INHERITANCE___(ASTNode, Trap);

Trap.prototype.clone = function() {
   return new Trap(this.id, this.loc, this.nodebug, this.trap_name,
		   this.clone_children());
}

/*---------------------------------------------------------------------*/
/*    Exit ...                                                         */
/*---------------------------------------------------------------------*/
function Exit( id, loc, nodebug, trap_name ) {
   ASTNode.call( this, "EXIT", id, loc, nodebug, undefined );
   this.trap_name = trap_name;
   this.return_code = 2;
}
st.___DEFINE_INHERITANCE___(ASTNode, Exit);

Exit.prototype.clone = function() {
   return new Exit(this.id, this.loc, this.nodebug, this.trap_name);
}

/*---------------------------------------------------------------------*/
/*    Halt ...                                                         */
/*---------------------------------------------------------------------*/
function Halt( id, loc, nodebug ) {
   ASTNode.call( this, "HALT", id, loc, nodebug, undefined );
}
st.___DEFINE_INHERITANCE___(ASTNode, Halt);

Halt.prototype.clone = function() {
   return new Halt(this.id, this.loc, this.nodebug);
}

/*---------------------------------------------------------------------*/
/*    Atom ...                                                         */
/*---------------------------------------------------------------------*/
function Atom( id, loc, nodebug, func, accessor_list ) {
   ActionNode.call( this, "ATOM", id, loc,
		    nodebug, undefined, func, accessor_list );
}
st.___DEFINE_INHERITANCE___(ActionNode, Atom);

Atom.prototype.clone = function() {
   return new Atom(this.id, this.loc, this.nodebug, this.func,
		   clone_list(this.accessor_list));
}

/*---------------------------------------------------------------------*/
/*    Await ...                                                        */
/*---------------------------------------------------------------------*/
function Await( id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count ) {
   CountExpressionNode.call( this, "AWAIT", id, loc,
			     nodebug, undefined, func,
			     accessor_list, immediate, func_count,
			     accessor_list_count );
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Await);

Await.prototype.clone = function() {
   return new Await(this.id, this.loc, this.nodebug, this.func,
		    clone_list(this.accessor_list),
		    this.immediate, this.func_count,
		    clone_list(this.accessor_list_count));
}

/*---------------------------------------------------------------------*/
/*    Module ...                                                       */
/*---------------------------------------------------------------------*/
function Module( id, loc, name, signal_declaration_list, children ) {
   ASTNode.call( this, "MODULE", id, loc, false, children );
   this.signal_declaration_list = signal_declaration_list;
   this.module_instance_id = null;
   this.name = name;
}
st.___DEFINE_INHERITANCE___(ASTNode, Module)

Module.prototype.clone = function() {
   return new Module(this.id, this.loc, this.name,
		     clone_list(this.signal_declaration_list),
		     this.clone_children());
}

/*---------------------------------------------------------------------*/
/*    Abort ...                                                        */
/*---------------------------------------------------------------------*/
function Abort( id, loc, nodebug, func, accessor_list, immediate,
	       func_count, accessor_list_count, children ) {
   CountExpressionNode.call( this, "ABORT", id, loc,
			     nodebug, children, func,
			     accessor_list, immediate, func_count,
			     accessor_list_count );
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Abort);

Abort.prototype.clone = function() {
   return new Abort(this.id, this.loc, this.nodebug, this.func,
		    clone_list(this.accessor_list), this.immediate,
		    this.func_count, clone_list(this.accessor_list_count),
		    this.clone_children());
}


/*---------------------------------------------------------------------*/
/*    WeakAbort ...                                                    */
/*---------------------------------------------------------------------*/
function WeakAbort( id, loc, nodebug, func, accessor_list, immediate,
		    func_count, accessor_list_count, children ) {
   let trap_name = "WEAKABORT_END_BODY";
   let c = new Trap( null, loc, true, trap_name, new Fork(null, loc, true, [
      new Sequence( null, loc, true, [
	 new Await( null, loc, true, func, accessor_list, immediate, func_count,
		    accessor_list_count ),
	 new Exit( null, loc, true, trap_name )
      ]),
      new Sequence( null, loc, true, children )
   ]));
   CountExpressionNode.call( this, "WeakAbort", id, loc,
			     nodebug, c, func, accessor_list,
			     immediate, func_count, accessor_list_count );
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, WeakAbort);

WeakAbort.prototype.clone = function() {
   return new WeakAbort(this.id, this.loc, this.nodebug, this.func,
			clone_list(this.accessor_list), this.immediate,
			this.func_count, clone_list(this.accessor_list_count),
			this.clone_children());
}

/*---------------------------------------------------------------------*/
/*    Loop ...                                                         */
/*---------------------------------------------------------------------*/
function Loop( id, loc, nodebug, children ) {
   ASTNode.call( this, "LOOP", id, loc, nodebug, children );
}
st.___DEFINE_INHERITANCE___(ASTNode, Loop);

Loop.prototype.clone = function() {
   return new Loop(this.id, this.loc, this.nodebug, this.clone_children());
}

/*---------------------------------------------------------------------*/
/*    LoopEach ...                                                     */
/*---------------------------------------------------------------------*/
function LoopEach( id, loc, nodebug, children, func, accessor_list, func_count,
		   accessor_list_count ) {
   CountExpressionNode.call( this, "LOOPEACH", id, loc,
			     nodebug, children, func,
			     accessor_list, false, func_count,
			     accessor_list_count );
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, LoopEach);

LoopEach.prototype.clone = function() {
   return new LoopEach(this.id, this.loc, this.nodebug, this.clone_children(),
		       this.func, clone_list(this.accessor_list),
		       this.func_count, clone_list(this.accessor_list_count));
}

/*---------------------------------------------------------------------*/
/*    Every ...                                                        */
/*---------------------------------------------------------------------*/
function Every( id, loc, nodebug, children, func, accessor_list, immediate,
		func_count, accessor_list_count ) {
   CountExpressionNode.call( this, "EVERY", id, loc,
			     nodebug, children, func,
			     accessor_list, immediate, func_count,
			     accessor_list_count );
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Every);

Every.prototype.clone = function() {
   return new Every(this.id, this.loc, this.nodebug, this.clone_children(),
		    this.func, clone_list(this.accessor_list), this.immediate,
		    this.func_count, clone_list(this.accessor_list_count));
}

/*---------------------------------------------------------------------*/
/*    Suspend ...                                                      */
/*---------------------------------------------------------------------*/
function Suspend( id, loc, nodebug, children, func, accessor_list, immediate ) {
   let _children = null;
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
      _children = new Trap(null, loc, true, trapName, _loop);
   } else {
      _children = children;
   }

   ExpressionNode.call( this, "SUSPEND", id, loc,
			nodebug, _children, func, accessor_list,
			immediate );
}
st.___DEFINE_INHERITANCE___(ExpressionNode, Suspend);

Suspend.prototype.clone = function() {
   return new Suspend(this.id, this.loc, this.nodebug, this.clone_children(),
		      this.func, clone_list(this.accessor_list),
		      this.immediate);
}

/*---------------------------------------------------------------------*/
/*    Fork ...                                                         */
/*---------------------------------------------------------------------*/
function Fork( id, loc, nodebug, children ) {
   ASTNode.call( this, "FORK", id, loc, nodebug, children );
}
st.___DEFINE_INHERITANCE___(ASTNode, Fork);

Fork.prototype.clone = function() {
   return new Fork(this.id, this.loc, this.nodebug, this.clone_children());
}

Fork.prototype.appendChild = function(ast_node, oneshot_reg=true) {
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
      this.machine.lazy_compile = true;

      if (sel && oneshot_reg == true)
	 ast_node.dynamically_added_in_sel = true;
   });
}

Fork.prototype.removeChild = function(ast_node) {
   this.machine.update(() => {
      //
      // We replace the removed branch by a nothing branch. Otherwise,
      // it could be a shift in the unique stable id of registers, and
      // restoration can restore values to wrong registers
      //
      let index = this.children.indexOf(ast_node);

      if (index > -1) {
	 this.children[index] = new Nothing(null, this.children[index].loc,
					    true);
	 this.machine.lazy_compile = true;
      }
   });
}

/*---------------------------------------------------------------------*/
/*    If ...                                                           */
/*---------------------------------------------------------------------*/
function If( id, loc, nodebug, children, not, func, accessor_list ) {
   if (children[1] == undefined)
      children[1] = new Nothing(null, loc, false);

   ExpressionNode.call( this, "IF", id, loc,
			nodebug, children, func, accessor_list,
			false );

   this.not = not;
}
st.___DEFINE_INHERITANCE___(ExpressionNode, If);

If.prototype.clone = function() {
   return new If(this.id, this.loc, this.nodebug, this.clone_children(),
		 this.not, this.func, clone_list(this.accessor_list))
}

/*---------------------------------------------------------------------*/
/*    SEQUENCE ...                                                     */
/*---------------------------------------------------------------------*/
function Sequence( id, loc, nodebug, children ) {
   ASTNode.call( this, "SEQUENCE", id, loc, nodebug, children );
}
st.___DEFINE_INHERITANCE___(ASTNode, Sequence);

Sequence.prototype.clone = function() {
   return new Sequence(this.id, this.loc, this.nodebug, this.clone_children());
}

/*---------------------------------------------------------------------*/
/*    RUN ...                                                          */
/*    -------------------------------------------------------------    */
/*    Run node has no runtime semantics, but it is usefull for the     */
/*    debugger: it permits to the debugger to split the main program   */
/*    into several instanciated modules.                               */
/*---------------------------------------------------------------------*/
function Run( id, loc, name, nodebug, body ) {
   ASTNode.call( this, "RUN", id, loc, nodebug, body );
   this.module_instance_id = null;
   this.name = name;
}
st.___DEFINE_INHERITANCE___(ASTNode, Run);

Run.prototype.clone = function() {
   return new Run(this.id, this.loc, this.name, this.nodebug,
		  this.clone_children());
}

/*---------------------------------------------------------------------*/
/*    Local ...                                                        */
/*---------------------------------------------------------------------*/
function Local( id, loc, nodebug, signal_declaration_list, children ) {
   ASTNode.call( this, "LOCAL", id, loc, nodebug, children );
   this.signal_declaration_list = signal_declaration_list;
   //
   // Tell if the Local is a child of a RUN intruction. Used for
   // debugger.
   //
   this.in_run_context = false;
   this.module_instance_id = null; // always null if not in run context.
}
st.___DEFINE_INHERITANCE___(ASTNode, Local);

//
// signal_declaration_list must not be cloned if the Local instruction
// is from a run_context: in that case, the list is already cloned
// before, in the RUN construct builder.
//
Local.prototype.clone = function() {
   let clone = new Local(this.id, this.loc, this.nodebug,
			 (this.in_run_context ?
			  this.signal_declaration_list :
			  clone_list(this.signal_declaration_list)),
			 this.clone_children());
   clone.in_run_context = this.in_run_context;
   return clone;
}

/*---------------------------------------------------------------------*/
/*    Exec ...                                                         */
/*---------------------------------------------------------------------*/
function Exec( id, loc, nodebug, signal_name, func_start,
	       func_start_accessor_list, func_res, func_susp, func_kill ) {
   ASTNode.call( this, "EXEC", id, loc, nodebug, undefined );
   this.func = func_start;
   this.accessor_list = func_start_accessor_list;
   this.func_res = func_res;
   this.func_susp = func_susp;
   this.func_kill = func_kill;
   this.signal_name = signal_name;

   //
   // If signal is present, this is the signal object emitted when
   // exec returns. (not the implicit signal for bookkeeping). Used by
   // debugger. Not clone!
   //
   this.signal = null;
}
st.___DEFINE_INHERITANCE___(ASTNode, Exec);

Exec.prototype.clone = function() {
   return new Exec(this.id, this.loc, this.nodebug, this.signal_name, this.func,
		   clone_list(this.accessor_list), this.func_res,
		   this.func_susp, this.func_kill);
}

/*---------------------------------------------------------------------*/
/*    SignalAccessor ...                                               */
/*    -------------------------------------------------------------    */
/*    Signal accessors. Exports for building them in lang.hs           */
/*---------------------------------------------------------------------*/
function SignalAccessor( signal_name, get_pre, get_value, is_counter = false ) {
   this.signal_name = signal_name;
   this.get_pre = get_pre;
   this.get_value = get_value;
   this.is_counter = is_counter;
}

SignalAccessor.prototype.clone = function() {
   return new SignalAccessor(
      this.signal_name, this.get_pre, this.get_value, this.is_counter );
}

/*---------------------------------------------------------------------*/
/*    SignalProperties ...                                             */
/*    -------------------------------------------------------------    */
/*    Properties of a signal. Exports for building them in lang.js     */
/*---------------------------------------------------------------------*/
function SignalProperties( id, loc, name, dir = lang.INOUT,
			   init_func, init_accessor_list,
			   reinit_func, reinit_accessor_list, combine, bound ) {
   this.id = id;
   this.name = name;
   this.loc = loc;
   this.accessibility = dir;
   this.init_func = init_func;
   this.init_accessor_list = init_accessor_list;
   this.reinit_func = reinit_func;
   this.reinit_accessor_list = reinit_accessor_list;
   this.combine_func = combine;
   this.bound = bound;
}

SignalProperties.prototype.clone = function() {
   return new SignalProperties( this.id, this.loc, this.name,
				this.accessibility, this.init_func,
				clone_list( this.init_accessor_list ),
				this.reinit_func,
				clone_list( this.reinit_accessor_list ),
				this.combine_func, this.bound );
}

/*---------------------------------------------------------------------*/
/*    clone_list ...                                                   */
/*    -------------------------------------------------------------    */
/*    Generic function for cloning signal accessor and signal          */
/*    properties.                                                      */
/*---------------------------------------------------------------------*/
function clone_list( lst ) {
   return lst.map(function( el, i, arr ) { return el.clone(); });
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
