"use strict"
"use hopscript"

const st = require("./inheritance.js");
const error = require("./error.js");
const lang = require("./lang.js");

function ASTNode(id, loc, nodebug, children) {
   if (!children)
      children = [];
   else if (children instanceof ASTNode)
      children = [ children ];
   else if (!(children instanceof Array))
      throw new error.InternalError("Building AST error", loc);

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
exports.ASTNode = ASTNode;

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

function ActionNode(id, loc, nodebug, children, func, accessor_list) {
   ASTNode.call(this, id, loc, nodebug, children);

   this.func = func;
   this.accessor_list = accessor_list;
}
st.___DEFINE_INHERITANCE___(ASTNode, ActionNode);
exports.ActionNode = ActionNode;

//
// ExpressionNode have same attributes than ActionNode, but implements
// different compilation methods
//
function ExpressionNode(id, loc, nodebug, children, func, accessor_list,
			immediate) {
   ActionNode.call(this, id, loc, nodebug, children, func, accessor_list);

   this.immediate = immediate;
}
st.___DEFINE_INHERITANCE___(ActionNode, ExpressionNode);
exports.ExpressionNode = ExpressionNode;

function CountExpressionNode(id, loc, nodebug, children, func, accessor_list,
			     immediate, func_count, accessor_list_count ) {
   ExpressionNode.call(this, id, loc, nodebug, children, func, accessor_list,
		       immediate);

   this.func_count = func_count;

   //
   // WARNING: accessor_list_count is undefined if no accessor are
   // provided (as contrary to accessor_list which always exists - and
   // can be empty)
   //
   this.accessor_list_count = accessor_list_count;
}
st.___DEFINE_INHERITANCE___(ExpressionNode, CountExpressionNode);
exports.CountExpressionNode = CountExpressionNode;

function Emit(id, loc, nodebug, signal_name_list, func, accessor_list, if_func,
	      if_accessor_list) {
   ActionNode.call(this, id, loc, nodebug, undefined, func, accessor_list);
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
st.___DEFINE_INHERITANCE___(ActionNode, Emit);
exports.Emit = Emit;

Emit.prototype.clone = function() {
   return new Emit(this.id, this.loc, this.nodebug, this.signal_name_list,
		   this.func, clone_list(this.accessor_list),
		   this.if_func, clone_list(this.if_accessor_list));
}

function Sustain(id, loc, nodebug, signal_name_list, func, accessor_list,
		 if_func, if_accessor_list) {
   Emit.call(this, id, loc, nodebug, signal_name_list, func, accessor_list,
	     if_func, if_accessor_list);
}
st.___DEFINE_INHERITANCE___(Emit, Sustain);
exports.Sustain = Sustain;

Sustain.prototype.clone = function() {
   return new Sustain(this.id, this.loc, this.nodebug, this.signal_name_list,
		      this.func, clone_list(this.accessor_list),
		      this.if_func, clone_list(this.if_accessor_list));
}

function Nothing(id, loc, nodebug) {
   ASTNode.call(this, id, loc, nodebug, undefined);
}
st.___DEFINE_INHERITANCE___(ASTNode, Nothing);
exports.Nothing = Nothing;

Nothing.prototype.clone = function() {
   return new Nothing(this.id, this.loc, this.nodebug);
}

function Pause(id, loc, nodebug) {
   ASTNode.call(this, id, loc, nodebug, undefined);
}
st.___DEFINE_INHERITANCE___(ASTNode, Pause);
exports.Pause = Pause;

Pause.prototype.clone = function() {
   return new Pause(this.id, this.loc, this.nodebug);
}

function Trap(id, loc, nodebug, trap_name, children) {
   ASTNode.call(this, id, loc, nodebug, children);
   this.trap_name = trap_name;
}
st.___DEFINE_INHERITANCE___(ASTNode, Trap);
exports.Trap = Trap;

Trap.prototype.clone = function() {
   return new Trap(this.id, this.loc, this.nodebug, this.trap_name,
		   this.clone_children());
}

function Exit(id, loc, nodebug, trap_name) {
   ASTNode.call(this, id, loc, nodebug, undefined);
   this.trap_name = trap_name;
   this.return_code = 2;
}
st.___DEFINE_INHERITANCE___(ASTNode, Exit);
exports.Exit = Exit;

Exit.prototype.clone = function() {
   return new Exit(this.id, this.loc, this.nodebug, this.trap_name);
}

function Halt(id, loc, nodebug) {
   ASTNode.call(this, id, loc, nodebug, undefined);
}
st.___DEFINE_INHERITANCE___(ASTNode, Halt);
exports.Halt = Halt;

Halt.prototype.clone = function() {
   return new Halt(this.id, this.loc, this.nodebug);
}

function Atom(id, loc, nodebug, func, accessor_list) {
   ActionNode.call(this, id, loc, nodebug, undefined, func, accessor_list);
}
st.___DEFINE_INHERITANCE___(ActionNode, Atom);
exports.Atom = Atom;

Atom.prototype.clone = function() {
   return new Atom(this.id, this.loc, this.nodebug, this.func,
		   clone_list(this.accessor_list));
}

function Await(id, loc, nodebug, func, accessor_list, immediate,
	       func_count, accessor_list_count) {
   CountExpressionNode.call(this, id, loc, nodebug, undefined, func,
			    accessor_list, immediate, func_count,
			    accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Await);
exports.Await = Await;

Await.prototype.clone = function() {
   return new Await(this.id, this.loc, this.nodebug, this.func,
		    clone_list(this.accessor_list),
		    this.immediate, this.func_count,
		    clone_list(this.accessor_list_count));
}

function Module(id, loc, name, signal_declaration_list, children) {
   ASTNode.call(this, id, loc, false, children);
   this.signal_declaration_list = signal_declaration_list;
   this.module_instance_id = null;
   this.name = name;
}
st.___DEFINE_INHERITANCE___(ASTNode, Module)
exports.Module = Module;

Module.prototype.clone = function() {
   return new Module(this.id, this.loc, this.name,
		     clone_list(this.signal_declaration_list),
		     this.clone_children());
}

function Abort(id, loc, nodebug, func, accessor_list, immediate,
	       func_count, accessor_list_count, children) {
   CountExpressionNode.call(this, id, loc, nodebug, children, func,
			    accessor_list, immediate, func_count,
			    accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Abort);
exports.Abort = Abort;

Abort.prototype.clone = function() {
   return new Abort(this.id, this.loc, this.nodebug, this.func,
		    clone_list(this.accessor_list), this.immediate,
		    this.func_count, clone_list(this.accessor_list_count),
		    this.clone_children());
}


function WeakAbort(id, loc, nodebug, func, accessor_list, immediate,
		   func_count, accessor_list_count, children) {
   CountExpressionNode.call(this, id, loc, nodebug, children, func,
			    accessor_list, immediate,
			    func_count, accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, WeakAbort);
exports.WeakAbort = WeakAbort;

WeakAbort.prototype.clone = function() {
   return new WeakAbort(this.id, this.loc, this.nodebug, this.func,
			clone_list(this.accessor_list), this.immediate,
			this.func_count, clone_list(this.accessor_list_count),
			this.clone_children());
}

function Loop(id, loc, nodebug, children) {
   ASTNode.call(this, id, loc, nodebug, children);
}
st.___DEFINE_INHERITANCE___(ASTNode, Loop);
exports.Loop = Loop;

Loop.prototype.clone = function() {
   return new Loop(this.id, this.loc, this.nodebug, this.clone_children());
}

function LoopEach(id, loc, nodebug, children, func, accessor_list, func_count,
		  accessor_list_count) {
   CountExpressionNode.call(this, id, loc, nodebug, children, func,
			    accessor_list, false, func_count,
			    accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, LoopEach);
exports.LoopEach = LoopEach;

LoopEach.prototype.clone = function() {
   return new LoopEach(this.id, this.loc, this.nodebug, this.clone_children(),
		       this.func, clone_list(this.accessor_list),
		       this.func_count, clone_list(this.accessor_list_count));
}

function Every(id, loc, nodebug, children, func, accessor_list, immediate,
	       func_count, accessor_list_count) {
   CountExpressionNode.call(this, id, loc, nodebug, children, func,
			    accessor_list, immediate, func_count,
			    accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Every);
exports.Every = Every;

Every.prototype.clone = function() {
   return new Every(this.id, this.loc, this.nodebug, this.clone_children(),
		    this.func, clone_list(this.accessor_list), this.immediate,
		    this.func_count, clone_list(this.accessor_list_count));
}

function Suspend(id, loc, nodebug, children, func, accessor_list, immediate) {
   ExpressionNode.call(this, id, loc, nodebug, children, func, accessor_list,
		       immediate);
}
st.___DEFINE_INHERITANCE___(ExpressionNode, Suspend);
exports.Suspend = Suspend;

Suspend.prototype.clone = function() {
   return new Suspend(this.id, this.loc, this.nodebug, this.clone_children(),
		      this.func, clone_list(this.accessor_list),
		      this.immediate);
}

function Parallel(id, loc, nodebug, children) {
   ASTNode.call(this, id, loc, nodebug, children);
}
st.___DEFINE_INHERITANCE___(ASTNode, Parallel);
exports.Parallel = Parallel;

Parallel.prototype.clone = function() {
   return new Parallel(this.id, this.loc, this.nodebug, this.clone_children());
}

Parallel.prototype.appendChild = function(ast_node, oneshot_reg=true) {
   if (!(ast_node instanceof ASTNode))
      throw new error.SyntaxError("Child is not an Hiphop.js instruction",
				  this.loc);

   if (ast_node instanceof Module)
      throw new error.SyntaxError("Child can't be a Module.",
				  + " (you may want use RUN?)", this.loc);

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
}

Parallel.prototype.removeChild = function(ast_node) {
   //
   // We replace the removed branch by a nothing branch. Otherwise, it
   // could be a shift in the unique stable id of registers, and
   // restoration can restore values to wrong registers
   //
   let index = this.children.indexOf(ast_node);

   if (index > -1) {
      this.children[index] = new Nothing(null, this.children[index].loc, true);

      //
      // Then, we just defers removal of all nets of the branch
      // (recompilation is not mandatory).
      //
      this.machine.lazy_branch_removal_list.push(ast_node);
   }
}

function If(id, loc, nodebug, children, not, func, accessor_list) {
   if (children[1] == undefined)
      children[1] = new Nothing(null, loc, false);

   ExpressionNode.call(this, id, loc, nodebug, children, func, accessor_list,
		       false);

   this.not = not;
}
st.___DEFINE_INHERITANCE___(ExpressionNode, If);
exports.If = If;

If.prototype.clone = function() {
   return new If(this.id, this.loc, this.nodebug, this.clone_children(),
		 this.not, this.func, clone_list(this.accessor_list))
}

function Sequence(id, loc, nodebug, children) {
   ASTNode.call(this, id, loc, nodebug, children);
}
st.___DEFINE_INHERITANCE___(ASTNode, Sequence);
exports.Sequence = Sequence;

Sequence.prototype.clone = function() {
   return new Sequence(this.id, this.loc, this.nodebug, this.clone_children());
}

//
// Run node has no runtime semantics, but it is usefull for the
// debugger: it permits to the debugger to split the main program into
// several instanciated modules.
//
function Run(id, loc, name, nodebug, body) {
   ASTNode.call(this, id, loc, nodebug, body);
   this.module_instance_id = null;
   this.name = name;
}
st.___DEFINE_INHERITANCE___(ASTNode, Run);
exports.Run = Run;

Run.prototype.clone = function() {
   return new Run(this.id, this.loc, this.name, this.nodebug,
		  this.clone_children());
}

function Let(id, loc, nodebug, signal_declaration_list, children) {
   ASTNode.call(this, id, loc, nodebug, children);
   this.signal_declaration_list = signal_declaration_list;
   //
   // Tell if the Let is a child of a RUN intruction. Used for
   // debugger.
   //
   this.in_run_context = false;
   this.module_instance_id = null; // always null if not in run context.
}
st.___DEFINE_INHERITANCE___(ASTNode, Let);
exports.Let = Let

//
// signal_declaration_list must not be cloned if the Let instruction
// is from a run_context: in that case, the list is already cloned
// before, in the RUN construct builder.
//
Let.prototype.clone = function() {
   let clone = new Let(this.id, this.loc, this.nodebug,
		       (this.in_run_context ?
			this.signal_declaration_list :
			clone_list(this.signal_declaration_list)),
		       this.clone_children());
   clone.in_run_context = this.in_run_context;
   return clone;
}

function Exec(id, loc, nodebug, signal_name, func_start,
	      func_start_accessor_list, func_res, func_susp, func_kill) {
   ASTNode.call(this, id, loc, nodebug, undefined);
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
exports.Exec = Exec;

Exec.prototype.clone = function() {
   return new Exec(this.id, this.loc, this.nodebug, this.signal_name, this.func,
		   clone_list(this.accessor_list), this.func_res,
		   this.func_susp, this.func_kill);
}

//
// Signal accessors. Exports for building them in lang.hs
//
function SignalAccessor(signal_name, get_pre, get_value) {
   this.signal_name = signal_name;
   this.get_pre = get_pre;
   this.get_value = get_value;
}
exports.SignalAccessor = SignalAccessor;

SignalAccessor.prototype.clone = function() {
   return new SignalAccessor(this.signal_name, this.get_pre, this.get_value);
}

//
// Properties of a signal. Exports for building them in lang.js
//
function SignalProperties(name, acc, init_func, init_accessor_list,
			  reinit_func, reinit_accessor_list, combine, bound) {
   this.name = name;
   this.accessibility = acc ? acc : lang.INOUT;
   this.init_func = init_func;
   this.init_accessor_list = init_accessor_list;
   this.reinit_func = reinit_func;
   this.reinit_accessor_list = reinit_accessor_list;
   this.combine_func = combine;
   this.bound = bound;
}
exports.SignalProperties = SignalProperties;

SignalProperties.prototype.clone = function() {
   return new SignalProperties(this.name, this.accessibility, this.init_func,
			       clone_list(this.init_accessor_list),
			       this.reinit_func,
			       clone_list(this.reinit_accessor_list),
			       this.combine_func, this.bound);
}

//
// Generic function for cloning signal accessor and signal properties.
//
function clone_list(lst) {
   return lst.map(function(el, i, arr) {
      return el.clone();
   });
}
