"use hopscript"

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

function ExpressionNode(id, loc, children, func, args_list) {
   ASTNode.call(this, id, loc, children);

   this.func = func;
   this.args_list = args_list;
}

___DEFINE_INHERITANCE___(ASTNode, ExpressionNode);

exports.ExpressionNode = ExpressionNode;

ExpressionNode.prototype.pretty_print_param = function() {
   function print_arg(arg) {
      let arg_buf = arg.signal_name;

      if (arg instanceof lang.SignalAccessor) {
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

function CountExpressionNode(id, loc, children, func, args_list,
			     func_count, args_list_count ) {
   ExpressionNode.call(this, id, loc, children, func, args_list);

   this.func_count = func_count;
   this.args_list_count = args_list_count;
}

___DEFINE_INHERITANCE___(ExpressionNode, CountExpressionNode);

exports.CountExpressionNode = CountExpressionNode;

function Emit(id, loc, signal_name, func, args_list) {
   ASTNode.call(this, id, loc, undefined);
   this.signal_name = signal_name;
   this.func = func;
   this.args_list = args_list;
}

/* Emit is NOT an ExpressionNode, even if it contains one. Emit is a specific
   case that use an expression to get the value and set it in a signal. It's
   the only statement that do this thing, so we avoid the overload of a class
   hierarchy for just it... */
___DEFINE_INHERITANCE___(ASTNode, Emit);

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
   ASTNode.call(this, id, loc, undefined);
   this.signal_name = signal_name;
   this.func = func;
   this.args_list = args_list;
}

___DEFINE_INHERITANCE___(ASTNode, Sustain);

exports.Sustain = Sustain;

Sustain.prototype.clone = function() {
   return new Sustain(this.id, this.loc, this.signal_name, this.func,
		      this.args_list);
}

function Nothing(id, loc) {
   ASTNode.call(this, id, loc, undefined);
}

___DEFINE_INHERITANCE___(ASTNode, Nothing);

exports.Nothing = Nothing;

Nothing.prototype.clone = function() {
   return new Nothing(this.id, this.loc);
}

function Pause(id, loc) {
   ASTNode.call(this, id, loc, undefined);
   this.k0_on_depth = false;
}

___DEFINE_INHERITANCE___(ASTNode, Pause);

exports.Pause = Pause;

Pause.prototype.clone = function() {
   return new Pause(this.id, this.loc);
}

function Exit(id, loc, trap_name) {
   ASTNode.call(this, id, loc, undefined);
   this.trap_name = trap_name;
   this.return_code = 2;
}

___DEFINE_INHERITANCE___(ASTNode, Exit);

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

___DEFINE_INHERITANCE___(ASTNode, Halt);

exports.Halt = Halt;

Halt.prototype.clone = function() {
   return new Halt(this.id, this.loc);
}

function Atom(id, loc, func, args_list) {
   ExpressionNode.call(this, id, loc, undefined);
}

___DEFINE_INHERITANCE___(ExpressionNode, Atom);

exports.Atom = Atom;

Atom.prototype.clone = function() {
   return new Atom(this.id, this.loc, this.func, this.args_list);
}

function Await(id, loc, immediate, func, args_list, func_count,
	       args_list_count) {
   CountExpressionNode.call(this, id, loc, undefined, func, args_list,
			    func_count, args_list_count);
   this.immediate = immediate;
}

___DEFINE_INHERITANCE___(CountExpressionNode, Await);

exports.Await = Await;

Await.prototype.clone = function() {
   return new Await(this.id, this.loc, this.immediate, this.func,
		    this.args_list, this.func_count, this.args_list_count);
}

function Trap(id, loc, trap_name, children) {
   ASTNode.call(this, id, loc, children);
   this.trap_name = trap_name;
}

___DEFINE_INHERITANCE___(ASTNode, Trap);

exports.Trap = Trap;

Trap.prototype.clone = function() {
   return new Trap(this.id, this.loc, this.trap_name, this.clone_children());
}

Trap.prototype.pretty_print_param = function() {
   return " " + this.trap_name;
}

function Module(loc, children) {
   ASTNode.call(this, undefined, loc, children);
}

___DEFINE_INHERITANCE___(ASTNode, Module)

exports.Module = Module;

Module.prototype.clone = function() {
   return new Module(this.loc, this.clone_children());
}

function Abort(id,
	       loc,
	       immediate,
	       func,
	       args_list,
	       func_count,
	       args_list_count,
	       children) {
   CountExpressionNode.call(this, id, loc, children, func, args_list,
			    func_count, args_list_count);
   this.immediate = immediate;
}

___DEFINE_INHERITANCE___(CountExpressionNode, Abort);

exports.Abort = Abort;

Abort.prototype.clone = function() {
   return new Abort(this.id, this.loc, this.immediate,
		    this.func, this.args_list,
		    this.func_count, this.args_list_count,
		    this.clone_children());
}

function Loop(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

___DEFINE_INHERITANCE___(ASTNode, Loop);

exports.Loop = Loop;

Loop.prototype.clone = function() {
   return new Loop(this.id, this.loc, this.clone_children());
}

function LoopEach(id, loc, children, signal_name, test_pre, count) {
   ASTNode.call(this, id, loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.count = count;
}

___DEFINE_INHERITANCE___(ASTNode, LoopEach);

exports.LoopEach = LoopEach;

LoopEach.prototype.clone = function() {
   return new LoopEach(this.id, this.loc, this.get_children(), this.signal_name,
		       this.test_pre, this.count);
}

function Every(id, loc, children, signal_name, count, immediate) {
   ASTNode.call(this, id, loc, children);
   this.signal_name = signal_name;
   this.count = count;
   this.immediate = immediate;
}

___DEFINE_INHERITANCE___(ASTNode, Every);

exports.Every = Every;

Every.prototype.clone = function() {
   return new Every(this.id, this.loc, this.clone_children(), this.signal_name,
		    this.count, this.immediate);
}

function Suspend(id, loc, signal_name, test_pre, children) {
   ASTNode.call(this, id, loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}

___DEFINE_INHERITANCE___(ASTNode, Suspend);

exports.Suspend = Suspend;

Suspend.prototype.clone = function() {
   return new Suspend(this.id, this.loc, this.signal_name, this.test_pre,
		      this.clone_children());
}

function Parallel(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

___DEFINE_INHERITANCE___(ASTNode, Parallel);

exports.Parallel = Parallel;

Parallel.prototype.clone = function() {
   return new Parallel(this.id, this.loc, this.clone_children());
}

function If(id, loc, not, func, args_list, children) {
   if (children[1] == undefined)
      children[1] = new Nothing(undefined, loc);

   ExpressionNode.call(this, id, loc, children, func, args_list);
   this.not = not;
}

___DEFINE_INHERITANCE___(ExpressionNode, If);

exports.If = If;

If.prototype.clone = function() {
   return new If(this.id, this.loc, this.not, this.func, this.args_list,
		 this.clone_children())
}

function Sequence(id, loc, children) {
   ASTNode.call(this, id, loc, children);
}

___DEFINE_INHERITANCE___(ASTNode, Sequence);

exports.Sequence = Sequence;

Sequence.prototype.clone = function() {
   return new Sequence(this.id, this.loc, this.clone_children());
}

/* sigs_assoc must be checked before the call of this constructor,
   see lang.js */

function Run(id, loc, module_stmts, sigs_assoc) {
   ASTNode.call(this, id, loc, module_stmts);

   this.sigs_assoc = sigs_assoc;
}

___DEFINE_INHERITANCE___(ASTNode, Run);

exports.Run = Run;

Run.prototype.clone = function() {
   return new Run(this.id, this.loc, this.ast, this.sigs_assoc);
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

___DEFINE_INHERITANCE___(ASTNode, Signal);

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
}

___DEFINE_INHERITANCE___(Signal, LocalSignal);

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

___DEFINE_INHERITANCE___(Signal, InputSignal);

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

___DEFINE_INHERITANCE___(Signal, OutputSignal);

exports.OutputSignal = OutputSignal;

OutputSignal.prototype.clone = function() {
   return new OutputSignal(this.loc, this.signal_name, this.type,
			   this.init_value, this.combine_with, this.valued);
}
