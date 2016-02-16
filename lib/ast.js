"use hopscript"

const error = require("./error.js");

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

   for (let i this.children)
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

function Emit(id, loc, signal_name, func, args) {
   ASTNode.call(this, id, loc, undefined);
   this.signal_name = signal_name;
   this.func = func;
   this.args = args;
}

___DEFINE_INHERITANCE___(ASTNode, Emit);

exports.Emit = Emit;

Emit.prototype.clone = function() {
   return new Emit(this.id, this.loc, this.signal_name, this.func, this.args);
}

Emit.prototype.pretty_print_param = function() {
   return " " + this.signal_name;
}

function Sustain(id, loc, signal_name, func, args) {
   ASTNode.call(this, id, loc, undefined);
   this.signal_name = signal_name;
   this.func = func;
   this.args = args;
}

___DEFINE_INHERITANCE___(ASTNode, Sustain);

exports.Sustain = Sustain;

Sustain.prototype.clone = function() {
   return new Sustain(this.id, this.loc, this.signal_name, this.func,
		      this.args);
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

function Atom(id, loc, func, args) {
   ASTNode.call(this, id, loc, undefined);
   this.func = func;
   this.args = args;
}

___DEFINE_INHERITANCE___(ASTNode, Atom);

exports.Atom = Atom;

Atom.prototype.clone = function() {
   return new Atom(this.id, this.loc, this.func, this.args);
}

function Await(id, loc, signal_name, test_pre, immediate, count) {
   ASTNode.call(this, id, loc, undefined);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.count = count;
}

___DEFINE_INHERITANCE___(ASTNode, Await);

exports.Await = Await;

Await.prototype.clone = function() {
   return new Await(this.id, this.loc, this.func, this.args);
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
	       signal_name,
	       test_pre,
	       immediate,
	       count,
	       children) {
   ASTNode.call(this, id, loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.count = count;
}

___DEFINE_INHERITANCE___(ASTNode, Abort);

exports.Abort = Abort;

Abort.prototype.clone = function() {
   return new Abort(this.id, this.loc, this.signal_name, this.test_pre,
		    this.immediate, this.count, this.clone_children());
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

function If(id, loc, not, func, args, children) {
   if (children[1] == undefined)
      children[1] = new Nothing(undefined, loc);

   ASTNode.call(this, id, loc, children);
   this.not = not;
   this.func = func;
   this.args = args;
}

___DEFINE_INHERITANCE___(ASTNode, If);

exports.If = If;

If.prototype.clone = function() {
   return new If(this.id, this.loc, this.not, this.func, this.args,
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
