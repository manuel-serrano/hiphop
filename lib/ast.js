"use strict"
"use hopscript"

const st = require("./inheritance.js");
const error = require("./error.js");
const lang = require("./lang.js");

function ASTNode(id, loc, children) {
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

   /* unset here, use in compiler to store circuit interface on make circuit
      phase, and connect on others circuit on connect circuit phase */
   this.cinterface = null;
   this.register_list = null;
   this.net_list = [];

   /* Fields used to give a stable id on register that can be created
      when translating this ast node. Each times a registed is created inside
      this node, we assign as unique id the value
        "" + this.instr_depth + this.instr_seq + this.next_register_id++ */
   this.instr_seq = 0;
   this.next_register_id = 0;

   /* Tell if the branch is dynamically added since last compilation and if
      this branch is embedded on a selected parallel. If true the compiler can
      add a one shot register to 1. Nobody should refers to this variable:
      the compiler will override it after the compilation that will follow
      appendChild() */
   this.dynamically_added_in_sel = false;
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

ASTNode.prototype.pretty_print = function(format=null) {
   function default_format(indent, ast_node, sel) {
      let buf = "[" + ast_node.depth + "] ";

      for (let i = 0; i < indent; i++)
      	 buf += " ";
      buf += "+--- " + ast_node.constructor.name + ast_node.pretty_print_param()

      if (sel)
	 /* web browser seems they don't support the following characters on
	    the exported js source:
	    buf += "\x1b[31m\x1b[1m" + instruction + "\x1b[0m";
	 */
	 buf += "*";
      buf += "\n";
      return buf;
   }

   return this._pretty_print(0, format ? format : default_format);
}

ASTNode.prototype._pretty_print = function(indent, format) {
   let sel = false;

   for (let i in this.register_list)
      if (this.register_list[i].value == true)
	 sel = true;

   let buf = format(indent, this, sel);

   for (let i in this.children)
      buf += this.children[i]._pretty_print(indent + 3, format);

   return buf;
}

ASTNode.prototype.pretty_print_param = function() {
   return "";
}

function ActionNode(id, loc, children, func, accessor_list) {
   ASTNode.call(this, id, loc, children);

   this.func = func;
   this.accessor_list = accessor_list;
}

st.___DEFINE_INHERITANCE___(ASTNode, ActionNode);

ActionNode.prototype.pretty_print_param = function() {
   return "";
}

exports.ActionNode = ActionNode;

/* ExpressionNode have same attributes than ActionNode, but implements different
   compilation methods */

function ExpressionNode(id, loc, children, func, accessor_list, immediate) {
   ActionNode.call(this, id, loc, children, func, accessor_list);

   this.immediate = immediate;
}

st.___DEFINE_INHERITANCE___(ActionNode, ExpressionNode);

exports.ExpressionNode = ExpressionNode;

function CountExpressionNode(id, loc, children, func, accessor_list, immediate,
			     func_count, accessor_list_count ) {
   ExpressionNode.call(this, id, loc, children, func, accessor_list, immediate);

   this.func_count = func_count;

   /* WARNING: accessor_list_count is undefined if no accessor are provided
      (as contrary to accessor_list which always exists - and can be empty) */
   this.accessor_list_count = accessor_list_count;
}

st.___DEFINE_INHERITANCE___(ExpressionNode, CountExpressionNode);

exports.CountExpressionNode = CountExpressionNode;

function Emit(id, loc, signal_name, func, accessor_list) {
   ActionNode.call(this, id, loc, undefined, func, accessor_list);
   this.signal_name = signal_name;
}

st.___DEFINE_INHERITANCE___(ActionNode, Emit);

exports.Emit = Emit;

Emit.prototype.clone = function() {
   return new Emit(this.id, this.loc, this.signal_name,
		   this.func, clone_accessor_list(this.accessor_list));
}

Emit.prototype.pretty_print_param = function() {
   return " " + this.signal_name;
}

function Sustain(id, loc, signal_name, func, accessor_list) {
   Emit.call(this, id, loc, signal_name, func, accessor_list);
}

st.___DEFINE_INHERITANCE___(Emit, Sustain);

exports.Sustain = Sustain;

Sustain.prototype.clone = function() {
   return new Sustain(this.id, this.loc, this.signal_name,
		      this.func, clone_accessor_list(this.accessor_list));
}

function Nothing(id, loc) {
   ASTNode.call(this, id, loc, undefined);
}

st.___DEFINE_INHERITANCE___(ASTNode, Nothing);

exports.Nothing = Nothing;

Nothing.prototype.clone = function() {
   return new Nothing(this.id, this.loc);
}

function Pause(id, loc) {
   ASTNode.call(this, id, loc, undefined);
}

st.___DEFINE_INHERITANCE___(ASTNode, Pause);

exports.Pause = Pause;

Pause.prototype.clone = function() {
   return new Pause(this.id, this.loc);
}

function Trap(id, loc, trap_name, children) {
   ASTNode.call(this, id, loc, children);
   this.trap_name = trap_name;
}

st.___DEFINE_INHERITANCE___(ASTNode, Trap);

exports.Trap = Trap;

Trap.prototype.clone = function() {
   return new Trap(this.id, this.loc, this.trap_name, this.clone_children());
}

Trap.prototype.pretty_print_param = function() {
   return " " + this.trap_name;
}

function Exit(id, loc, trap_name) {
   ASTNode.call(this, id, loc, undefined);
   this.trap_name = trap_name;
   this.return_code = 2;
}

st.___DEFINE_INHERITANCE___(ASTNode, Exit);

exports.Exit = Exit;

Exit.prototype.clone = function() {
   return new Exit(this.id, this.loc, this.trap_name);
}

Exit.prototype.pretty_print_param = function() {
   return " " +  this.trap_name + "(" + this.return_code + ")";
}

function Halt(id, loc) {
   ASTNode.call(this, id, loc, undefined);
}

st.___DEFINE_INHERITANCE___(ASTNode, Halt);

exports.Halt = Halt;

Halt.prototype.clone = function() {
   return new Halt(this.id, this.loc);
}

function Atom(id, loc, func, accessor_list) {
   ActionNode.call(this, id, loc, undefined, func, accessor_list);
}

st.___DEFINE_INHERITANCE___(ActionNode, Atom);

exports.Atom = Atom;

Atom.prototype.clone = function() {
   return new Atom(this.id, this.loc, this.func,
		   clone_accessor_list(this.accessor_list));
}

function Await(id, loc, func, accessor_list, immediate,
	       func_count, accessor_list_count) {
   CountExpressionNode.call(this, id, loc, undefined, func, accessor_list,
			    immediate, func_count, accessor_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, Await);

exports.Await = Await;

Await.prototype.clone = function() {
   return new Await(this.id, this.loc, this.func,
		    clone_accessor_list(this.accessor_list),
		    this.immediate, this.func_count,
		    clone_accessor_list(this.accessor_list_count));
}

function Module(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

st.___DEFINE_INHERITANCE___(ASTNode, Module)

exports.Module = Module;

Module.prototype.clone = function() {
   return new Module(this.id, this.loc, this.clone_children());
}

function Abort(id,
	       loc,
	       func,
	       accessor_list,
	       immediate,
	       func_count,
	       accessor_list_count,
	       children) {
   CountExpressionNode.call(this, id, loc, children, func, accessor_list,
			    immediate, func_count, accessor_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, Abort);

exports.Abort = Abort;

Abort.prototype.clone = function() {
   return new Abort(this.id, this.loc, this.func,
		    clone_accessor_list(this.accessor_list),
		    this.immediate, this.func_count,
		    clone_accessor_list(this.accessor_list_count),
		    this.clone_children());
}


function WeakAbort(id,
		   loc,
		   func,
		   accessor_list,
		   immediate,
		   func_count,
		   accessor_list_count,
		   children) {
   CountExpressionNode.call(this, id, loc, children, func, accessor_list, immediate,
			    func_count, accessor_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, WeakAbort);

exports.WeakAbort = WeakAbort;

WeakAbort.prototype.clone = function() {
   return new WeakAbort(this.id, this.loc, this.func,
			clone_accessor_list(this.accessor_list),
			this.immediate, this.func_count,
			clone_accessor_list(this.accessor_list_count),
			this.clone_children());
}

function Loop(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

st.___DEFINE_INHERITANCE___(ASTNode, Loop);

exports.Loop = Loop;

Loop.prototype.clone = function() {
   return new Loop(this.id, this.loc, this.clone_children());
}

function LoopEach(id, loc, children, func, accessor_list, func_count,
		  accessor_list_count) {
   CountExpressionNode.call(this, id, loc, children, func, accessor_list, false,
			    func_count, accessor_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, LoopEach);

exports.LoopEach = LoopEach;

LoopEach.prototype.clone = function() {
   return new LoopEach(this.id, this.loc, this.clone_children(), this.func,
		       clone_accessor_list(this.accessor_list), this.func_count,
		       clone_accessor_list(this.accessor_list_count));
}

function Every(id, loc, children, func, accessor_list, immediate, func_count,
	       accessor_list_count) {
   CountExpressionNode.call(this, id, loc, children, func, accessor_list,
			    immediate, func_count, accessor_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, Every);

exports.Every = Every;

Every.prototype.clone = function() {
   return new Every(this.id, this.loc, this.clone_children(), this.func,
		    clone_accessor_list(this.accessor_list), this.immediate,
		    this.func_count,
		    clone_accessor_list(this.accessor_list_count));
}

function Suspend(id, loc, children, func, accessor_list, immediate) {
   ExpressionNode.call(this, id, loc, children, func, accessor_list, immediate);
}

st.___DEFINE_INHERITANCE___(ExpressionNode, Suspend);

exports.Suspend = Suspend;

Suspend.prototype.clone = function() {
   return new Suspend(this.id, this.loc, this.clone_children(), this.func,
		      clone_accessor_list(this.accessor_list), this.immediate);
}

function Parallel(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

st.___DEFINE_INHERITANCE___(ASTNode, Parallel);

exports.Parallel = Parallel;

Parallel.prototype.clone = function() {
   return new Parallel(this.id, this.loc, this.clone_children());
}

Parallel.prototype.appendChild = function(ast_node, oneshot_reg=true) {
   if (!(ast_node instanceof ASTNode) ||
       ast_node instanceof Module ||
       ast_node instanceof InputSignal ||
       ast_node instanceof OutputSignal)
      throw new error.SyntaxError("Child must be a regular Hiphop program",
				  this.loc);
   this.children.push(ast_node);
   this.machine.lazy_compile = true;
   if (this.cinterface.sel && this.cinterface.sel.value == true &&
       oneshot_reg == true)
      ast_node.dynamically_added_in_sel = true;
}

Parallel.prototype.removeChild = function(ast_node) {
   /* We replace the removed branch by a nothing branch. Otherwise,
      it could be a shift in the unique stable id of registers, and restoration
      can restore values to wrong registers */
   let index = this.children.indexOf(ast_node);

   if (index > -1) {
      this.children[index] = new Nothing(null, this.children[index].loc);

   /* Then, we just defers removal of all nets of the branch (recompilation
      is not mandatory).*/
      this.machine.lazy_branch_removal_list.push(ast_node);
   }
}

function If(id, loc, children, not, func, accessor_list) {
   if (children[1] == undefined)
      children[1] = new Nothing(null, loc);

   ExpressionNode.call(this, id, loc, children, func, accessor_list, false);

   this.not = not;
}

st.___DEFINE_INHERITANCE___(ExpressionNode, If);

exports.If = If;

If.prototype.clone = function() {
   return new If(this.id, this.loc, this.clone_children(), this.not, this.func,
		 clone_accessor_list(this.accessor_list))
}

function Sequence(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

st.___DEFINE_INHERITANCE___(ASTNode, Sequence);

exports.Sequence = Sequence;

Sequence.prototype.clone = function() {
   return new Sequence(this.id, this.loc, this.clone_children());
}

function Let(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

st.___DEFINE_INHERITANCE___(ASTNode, Let);

exports.Let = Let

Let.prototype.clone = function() {
   return new Let(this.id, this.loc, this.clone_children());
}

/* sigs_assoc must be checked before the call of this constructor,
   see lang.js */

function Run(id, loc, module_stmts) {
   ASTNode.call(this, id, loc, module_stmts);
}

st.___DEFINE_INHERITANCE___(ASTNode, Run);

exports.Run = Run;

Run.prototype.clone = function() {
   return new Run(this.id, this.loc, this.clone_children());
}

/* _NOT_ LocalSignal node, see above */
function Signal(id,
		loc,
		children,
		signal_name,
		init_value,
		reinit_func,
		combine_func,
		valued) {
   ASTNode.call(this, id, loc, children);
   this.signal_name = signal_name;
   this.init_value = init_value;
   this.reinit_func = reinit_func;
   this.combine_func = combine_func;
   this.valued = valued;
}

st.___DEFINE_INHERITANCE___(ASTNode, Signal);

exports.Signal = Signal;

Signal.prototype.pretty_print_param = function() {
   return " " + this.signal_name;
}

function LocalSignal(id,
		     loc,
		     children,
		     signal_name,
		     init_value,
		     reinit_func,
		     combine_func,
		     valued) {
   Signal.call(this,
	       id,
	       loc,
	       children,
	       signal_name,
	       init_value,
	       reinit_func,
	       combine_func,
	       valued);
   this.original_name = signal_name;
}

st.___DEFINE_INHERITANCE___(Signal, LocalSignal);

exports.LocalSignal = LocalSignal;

LocalSignal.prototype.clone = function() {
   return new LocalSignal(this.id, this.loc, this.clone_children(),
			  this.signal_name, this.init_value, this.reinit_func,
			  this.combine_func, this.valued);
}

function InputSignal(id,
		     loc,
		     signal_name,
		     init_value,
		     reinit_func,
		     combine_func,
		     valued) {
   Signal.call(this,
	       id,
	       loc,
	       undefined,
	       signal_name,
	       init_value,
	       reinit_func,
	       combine_func,
	       valued);
}

st.___DEFINE_INHERITANCE___(Signal, InputSignal);

exports.InputSignal = InputSignal;

InputSignal.prototype.clone = function() {
   return new InputSignal(this.id, this.loc, this.signal_name,
			  this.init_value, this.reinit_func,
			  this.combine_func, this.valued);
}

function OutputSignal(id,
		      loc,
		      signal_name,
		      init_value,
		      reinit_func,
		      combine_func,
		      valued) {
   Signal.call(this,
	       id,
	       loc,
	       undefined,
	       signal_name,
	       init_value,
	       reinit_func,
	       combine_func,
	       valued);
}

st.___DEFINE_INHERITANCE___(Signal, OutputSignal);

exports.OutputSignal = OutputSignal;

OutputSignal.prototype.clone = function() {
   return new OutputSignal(this.id, this.loc, this.signal_name,
			   this.init_value, this.reinit_func,
			   this.combine_func, this.valued);
}

function IOSignal(id, loc, signal_name, init_value, reinit_func, combine_func,
		  valued) {
   Signal.call(this, id, loc, undefined, signal_name, init_value, reinit_func,
	       combine_func, valued);
}

st.___DEFINE_INHERITANCE___(Signal, IOSignal);

exports.IOSignal = IOSignal;

IOSignal.prototype.clone = function() {
   return new IOSignal(this.id, this.loc, this.signal_name,
		       this.init_value, this.reinit_func,
		       this.combine_func, this.valued);
}

function Exec(id, loc, signal_name, func_start, func_start_accessor_list,
	      func_res, func_susp, func_kill) {
   ASTNode.call(this, id, loc, undefined);
   this.func_start = func_start;
   this.func_start_accessor_list = func_start_accessor_list;
   this.func_res = func_res;
   this.func_susp = func_susp;
   this.func_kill = func_kill;
   this.signal_name = signal_name;
}

st.___DEFINE_INHERITANCE___(ASTNode, Exec);

exports.Exec = Exec;

Exec.prototype.clone = function() {
   return new Exec(this.id, this.loc, this.signal_name, this.func_start,
		   clone_accessor_list(this.func_start_accessor_list),
		   this.func_res, this.func_susp, this.func_kill);
}

function clone_accessor_list(lst) {
   if (!lst)
      return undefined;
   return lst.map(function(el, i, arr) {
      return new lang.SignalAccessor(el.signal_name, el.get_pre, el.get_value);
   });
}
