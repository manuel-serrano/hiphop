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

   for (let i in this.children)
      this.children[i].parent = this;

   /* unset here, use in compiler to store circuit interface on make circuit
      phase, and connect on others circuit on connect circuit phase */
   this.cinterface = null;
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
      cloned.push(this.children[i]);
   return cloned;
}

ASTNode.prototype.pretty_print = function(indent) {
   let buf = "[" + this.depth + "] ";

   for (let i = 0; i < indent; i++)
      buf += " ";
   buf += "+--- " + this.constructor.name + this.pretty_print_param() + "\n";

   for (let i in this.children)
      buf += this.children[i].pretty_print(indent + 3);

   return buf;
}

ASTNode.prototype.pretty_print_param = function() {
   return "";
}

function AppendChildNode(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

st.___DEFINE_INHERITANCE___(ASTNode, AppendChildNode);

AppendChildNode.prototype.appendChild = function(ast_node) {
   if (!(ast_node instanceof ASTNode))
      throw new error.SyntaxError("Child must be a regular Hiphop program",
				  this.loc);
   this.children.push(ast_node);
   this.machine.lazy_compile = true;
}

function ActionNode(id, loc, children, func, args_list) {
   ASTNode.call(this, id, loc, children);

   this.func = func;
   this.args_list = args_list;
}

st.___DEFINE_INHERITANCE___(ASTNode, ActionNode);

ActionNode.prototype.pretty_print_param = function() {
   function print_arg(arg) {
      let arg_buf = "";

      if (arg instanceof lang.SignalAccessor) {
	 arg_buf = arg.signal_name;
	 if (arg.get_value)
	     arg_buf = "?" + arg_buf;
	 if (arg.get_pre)
	    arg_buf = "pre(" + arg_buf + ")"
      } else {
	 arg_buf = arg;
      }

      return arg_buf;
   }

   let buf = " ";

   if (this.func) {
      let len = this.args_list.length;

      /* Node.JS has `name` attribute to function. Hop.JS ? */
      buf += this.func.name + "TODO_FUNC_NAME("
      for (let i = 0; i < len; i++) {
	 buf += print_arg(this.args_list[i])
	 if (i + 1 < len)
	    buf += ", ";
      }
      buf += ")";
   } else {
      buf += print_arg(this.args_list[0]);
   }

   return buf;
}

exports.ActionNode = ActionNode;

/* ExpressionNode have same attributes than ActionNode, but implements different
   compilation methods */

function ExpressionNode(id, loc, children, func, args_list, immediate) {
   ActionNode.call(this, id, loc, children, func, args_list);

   this.immediate = immediate;
}

st.___DEFINE_INHERITANCE___(ActionNode, ExpressionNode);

exports.ExpressionNode = ExpressionNode;

function CountExpressionNode(id, loc, children, func, args_list, immediate,
			     func_count, args_list_count ) {
   ExpressionNode.call(this, id, loc, children, func, args_list, immediate);

   this.func_count = func_count;
   this.args_list_count = args_list_count;

   /* We assert here (it must be check by lang module) that if immediate is
      set, there is no count expression */
}

st.___DEFINE_INHERITANCE___(ExpressionNode, CountExpressionNode);

CountExpressionNode.prototype.pretty_print_param = function() {
   let buf = ExpressionNode.prototype.pretty_print_param.call(this);

   if (this.func_count || this.args_list_count.length > 0)
      buf += " COUNT_PRETTY_PRINT_TODO";

   return buf;
}

exports.CountExpressionNode = CountExpressionNode;

function Emit(id, loc, signal_name, func, args_list) {
   ActionNode.call(this, id, loc, undefined, func, args_list);
   this.signal_name = signal_name;
}

st.___DEFINE_INHERITANCE___(ActionNode, Emit);

exports.Emit = Emit;

Emit.prototype.clone = function() {
   return new Emit(this.id, this.loc, this.signal_name, this.func,
		   this.args_list);
}

Emit.prototype.pretty_print_param = function() {
   let buf = " " + this.signal_name;

   if (this.func || this.args_list.length > 0) {
      let buf_expr = ExpressionNode.prototype.pretty_print_param.call(this);

      buf_expr = buf_expr.substring(1);
      buf += "(" + buf_expr  + ")";
   }
   return buf;
}

function Sustain(id, loc, signal_name, func, args_list) {
   Emit.call(this, id, loc, signal_name, func, args_list);
}

st.___DEFINE_INHERITANCE___(Emit, Sustain);

exports.Sustain = Sustain;

Sustain.prototype.clone = function() {
   return new Sustain(this.id, this.loc, this.signal_name, this.func,
		      this.args_list);
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

function Atom(id, loc, func, args_list) {
   ActionNode.call(this, id, loc, undefined, func, args_list);
}

st.___DEFINE_INHERITANCE___(ActionNode, Atom);

exports.Atom = Atom;

Atom.prototype.clone = function() {
   return new Atom(this.id, this.loc, this.func, this.args_list);
}

function Await(id, loc, func, args_list, immediate, func_count,
	       args_list_count) {
   CountExpressionNode.call(this, id, loc, undefined, func, args_list,
			    immediate, func_count, args_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, Await);

exports.Await = Await;

Await.prototype.clone = function() {
   return new Await(this.id, this.loc, this.func, this.args_list,
		    this.immediate, this.func_count, this.args_list_count);
}

function Module(loc, children) {
   ASTNode.call(this, undefined, loc, children);
}

st.___DEFINE_INHERITANCE___(ASTNode, Module)

exports.Module = Module;

Module.prototype.clone = function() {
   return new Module(this.loc, this.clone_children());
}

function Abort(id,
	       loc,
	       func,
	       args_list,
	       immediate,
	       func_count,
	       args_list_count,
	       children) {
   CountExpressionNode.call(this, id, loc, children, func, args_list,
			    immediate, func_count, args_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, Abort);

exports.Abort = Abort;

Abort.prototype.clone = function() {
   return new Abort(this.id, this.loc, this.func, this.args_list,
		    this.immediate, this.func_count, this.args_list_count,
		    this.clone_children());
}


function WeakAbort(id,
		   loc,
		   func,
		   args_list,
		   immediate,
		   func_count,
		   args_list_count,
		   children) {
   CountExpressionNode.call(this, id, loc, children, func, args_list,
			    immediate, func_count, args_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, WeakAbort);

exports.WeakAbort = WeakAbort;

WeakAbort.prototype.clone = function() {
   return new WeakAbort(this.id, this.loc, this.func, this.args_list,
			this.immediate, this.func_count, this.args_list_count,
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

function LoopEach(id, loc, children, func, args_list, immediate, func_count,
		  args_list_count) {
   CountExpressionNode.call(this, id, loc, children, func, args_list, immediate,
			    func_count, args_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, LoopEach);

exports.LoopEach = LoopEach;

LoopEach.prototype.clone = function() {
   return new LoopEach(this.id, this.loc, this.get_children(), this.func,
		       this.args_list, this.immediate, this.func_count,
		       this.args_list_count);
}

function Every(id, loc, children, func, args_list, immediate, func_count,
	       args_list_count) {
   CountExpressionNode.call(this, id, loc, children, func, args_list,
			    immediate, func_count, args_list_count);
}

st.___DEFINE_INHERITANCE___(CountExpressionNode, Every);

exports.Every = Every;

Every.prototype.clone = function() {
   return new Every(this.id, this.loc, this.clone_children(), this.func,
		    this.args_list, this.immediate, this.func_count,
		    this.args_list_count);
}

function Suspend(id, loc, children, func, args_list, immediate) {
   ExpressionNode.call(this, id, loc, children, func, args_list, immediate);
}

st.___DEFINE_INHERITANCE___(ExpressionNode, Suspend);

exports.Suspend = Suspend;

Suspend.prototype.clone = function() {
   return new Suspend(this.id, this.loc, this.clone_children(), this.func,
		      this.args_list, this.immediate);
}

function Parallel(id, loc, children) {
   AppendChildNode.call(this, id, loc, children);
}

st.___DEFINE_INHERITANCE___(AppendChildNode, Parallel);

exports.Parallel = Parallel;

Parallel.prototype.clone = function() {
   return new Parallel(this.id, this.loc, this.clone_children());
}

function If(id, loc, children, not, func, args_list) {
   if (children[1] == undefined)
      children[1] = new Nothing(undefined, loc);

   ExpressionNode.call(this, id, loc, children, func, args_list, false);

   /* TODO: `not` in circuit */
   this.not = not;
}

st.___DEFINE_INHERITANCE___(ExpressionNode, If);

exports.If = If;

If.prototype.clone = function() {
   return new If(this.id, this.loc, this.clone_children(), this.not,
		 this.func, this.args_list)
}

function Sequence(id, loc, children) {
   AppendChildNode.call(this, id, loc, children);
}

st.___DEFINE_INHERITANCE___(AppendChildNode, Sequence);

exports.Sequence = Sequence;

Sequence.prototype.clone = function() {
   return new Sequence(this.id, this.loc, this.clone_children());
}

/* sigs_assoc must be checked before the call of this constructor,
   see lang.js */

function Run(id, loc, module_stmts) {
   ASTNode.call(this, id, loc, module_stmts);
}

st.___DEFINE_INHERITANCE___(ASTNode, Run);

exports.Run = Run;

Run.prototype.clone = function() {
   return new Run(this.id, this.loc, this.ast);
}

function Signal(id,
		loc,
		children,
		signal_name,
		type,
		init_value,
		combine_with,
		valued) {
   ASTNode.call(this, id, loc, children);
   this.signal_name = signal_name;
   this.type = type;
   this.init_value = init_value;
   this.combine_with = combine_with;
   this.valued = valued;
}

st.___DEFINE_INHERITANCE___(ASTNode, Signal);

exports.Signal = Signal;

Signal.prototype.pretty_print_param = function() {
   return " " + this.signal_name;
}

function LocalSignal(id,
		     loc,
		     signal_name,
		     children,
		     type,
		     init_value,
		     combine_with,
		     valued) {
   Signal.call(this,
	       id,
	       loc,
	       children,
	       signal_name,
	       type,
	       init_value,
	       combine_with,
	       valued);
   this.renamed_from = signal_name;
}

st.___DEFINE_INHERITANCE___(Signal, LocalSignal);

exports.LocalSignal = LocalSignal;

LocalSignal.prototype.clone = function() {
   return new LocalSignal(this.id, this.loc, this.signal_name,
			  this.clone_children(), this.type, this.init_value,
			  this.combine_with, this.valued);
}

function InputSignal(loc,
		     signal_name,
		     type,
		     init_value,
		     combine_with,
		     valued) {
   Signal.call(this,
	       undefined,
	       loc,
	       undefined,
	       signal_name,
	       type,
	       init_value,
	       combine_with,
	       valued);
}

st.___DEFINE_INHERITANCE___(Signal, InputSignal);

exports.InputSignal = InputSignal;

InputSignal.prototype.clone = function() {
   return new InputSignal(this.loc, this.signal_name, this.type,
			  this.init_value, this.combine_with, this.valued);
}

function OutputSignal(loc,
		     signal_name,
		     type,
		     init_value,
		     combine_with,
		     valued) {
   Signal.call(this,
	       undefined,
	       loc,
	       undefined,
	       signal_name,
	       type,
	       init_value,
	       combine_with,
	       valued);
}

st.___DEFINE_INHERITANCE___(Signal, OutputSignal);

exports.OutputSignal = OutputSignal;

OutputSignal.prototype.clone = function() {
   return new OutputSignal(this.loc, this.signal_name, this.type,
			   this.init_value, this.combine_with, this.valued);
}
