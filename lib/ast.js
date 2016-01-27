"use hopscript"

const error = require("./error.js");

/* TODO
   - `children` alway on last argument position (coherence)
   - delete `name` attribute (we can use function name for pretty print)
*/

function ASTNode(id, name, loc, children) {
   if (!children)
      children = [];
   else if (children instanceof ASTNode)
      children = [ children ];
   else if (!(children instanceof Array))
      throw new error.InternalError("Building AST error", loc);

   this.name = name
   this.loc = loc;
   this.machine = null;
   this.parent = null;
   this.next = null;
   this.previous = null;
   this.children = children;
   this.incarnation = 0;
   this.id = id;

   for (let i = 0, n = this.children.length; i < n; i++) {
      this.children[i].previous = i > 0 ? this.children[i - 1] : null;
      this.children[i].next = i + 1 < n ? this.children[i + 1] : null;
      this.children[i].parent = this;
   }

   /* unset here, use in compiler to store circuit interface on make circuit
      phase, and connect on others circuit on connect circuit phase */
   this.circuit = null;

   /* unset here, use in compiler to store signals which are dependencies of
      an instruction, and use it during connect circuit phase */
   this.deps_test = [];
   this.deps_access = [];
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

ASTNode.prototype.make_circuit = function() {
   throw new error.InternalError("`make_circuit` must be implemented",
				 this.loc)
}

function Emit(id, loc, signal_name, func, exprs) {
   ASTNode.call(this, id, "EMIT", loc, undefined);
   this.signal_name = signal_name;
   this.func = func;
   this.exprs = exprs;
}

Emit.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Emit = Emit;

Emit.prototype.clone = function() {
   return new Emit(this.id, this.loc, this.signal_name, this.func, this.exprs);
}

function Sustain(id, loc, signal_name, func, exprs) {
   ASTNode.call(this, id, "SUSTAIN", loc, undefined);
   this.signal_name = signal_name;
   this.func = func;
   this.exprs = exprs;
}

Sustain.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Sustain = Sustain;

Sustain.prototype.clone = function() {
   return new Sustain(this.id, this.loc, this.signal_name, this.func,
		      this.exprs);
}

function Nothing(id, loc) {
   ASTNode.call(this, id, "NOTHING", loc, undefined);
}

Nothing.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Nothing = Nothing;

Nothing.prototype.clone = function() {
   return new Nothing(this.id, this.loc);
}

function Pause(id, loc) {
   ASTNode.call(this, id, "PAUSE", loc, undefined);
   this.new_incarnation_on_k0 = false;
}

Pause.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Pause = Pause;

Pause.prototype.clone = function() {
   return new Pause(this.id, this.loc);
}

function Exit(id, loc, trap_name) {
   ASTNode.call(this, id, "EXIT", loc, undefined);
   this.trap_name = trap_name;
   this.return_code = 2;
}

Exit.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Exit = Exit;

Exit.prototype.clone = function() {
   return new Exit(this.id, this.loc, this.trap_name);
}

function Halt(id, loc) {
   ASTNode.call(this, id, "HALT", loc, undefined);
}

Halt.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Halt = Halt;

Halt.prototype.clone = function() {
   return new Halt(this.id, this.loc);
}

function Atom(id, loc, func, exprs) {
   ASTNode.call(this, id, "ATOM", loc, undefined);
   this.func = func;
   this.exprs = exprs;
}

Atom.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Atom = Atom;

Atom.prototype.clone = function() {
   return new Atom(this.id, this.loc, this.func, this.exprs);
}

function Await(id, loc, signal_name, test_pre, immediate, count) {
   ASTNode.call(this, id, "AWAIT", loc, undefined);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.count = count;
}

Await.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Await = Await;

Await.prototype.clone = function() {
   return new Await(this.id, this.loc, this.func, this.exprs);
}

function Trap(id, loc, trap_name, children) {
   ASTNode.call(this, id, "TRAP", loc, children);
   this.trap_name = trap_name;
}

Trap.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Trap = Trap;

Trap.prototype.clone = function() {
   return new Trap(this.id, this.loc, this.trap_name, this.clone_children());
}

function Module(loc, children) {
   ASTNode.call(this, undefined, "MODULE", loc, children);
}

Module.prototype = new ASTNode(undefined, undefined, undefined, undefined);

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
   ASTNode.call(this, id, "ABORT", loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.count = count;
}

Abort.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Abort = Abort;

Abort.prototype.clone = function() {
   return new Abort(this.id, this.loc, this.signal_name, this.test_pre,
		    this.immediate, this.count, this.clone_children());
}

function Loop(id, loc, children) {
   ASTNode.call(this, id, "LOOP", loc, children);
}

Loop.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Loop = Loop;

Loop.prototype.clone = function() {
   return new Loop(this.id, this.loc, this.clone_children());
}

function LoopEach(id, loc, children, signal_name, test_pre, count) {
   ASTNode.call(this, id, "LOOPEACH", loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.count = count;
}

LoopEach.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.LoopEach = LoopEach;

LoopEach.prototype.clone = function() {
   return new LoopEach(this.id, this.loc, this.get_children(), this.signal_name,
		       this.test_pre, this.count);
}

function Every(id, loc, children, signal_name, count, immediate) {
   ASTNode.call(this, id, "EVERY", loc, children);
   this.signal_name = signal_name;
   this.count = count;
   this.immediate = immediate;
}

Every.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Every = Every;

Every.prototype.clone = function() {
   return new Every(this.id, this.loc, this.clone_children(), this.signal_name,
		    this.count, this.immediate);
}

function Suspend(id, loc, signal_name, test_pre, children) {
   ASTNode.call(this, id, "SUSPEND", loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}

Suspend.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Suspend = Suspend;

Suspend.prototype.clone = function() {
   return new Suspend(this.id, this.loc, this.signal_name, this.test_pre,
		      this.clone_children());
}

function Parallel(id, loc, children) {
   ASTNode.call(this, id, "PARALLEL", loc, children);
}

Parallel.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Parallel = Parallel;

Parallel.prototype.clone = function() {
   return new Parallel(this.id, this.loc, this.clone_children());
}

function Present(id, loc, signal_name, test_pre, children) {
   if (children[1] == undefined)
      children[1] = new Nothing(undefined, loc);

   ASTNode.call(this, id, "PRESENT", loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}

Present.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Present = Present;

Present.prototype.clone = function() {
   return new Present(this.id, this.loc, this.signal_name, this.test_pre,
		      this.clone_children());
}

function If(id, loc, not, func, exprs, children) {
   if (children[1] == undefined)
      children[1] = new Nothing(undefined, loc);

   ASTNode.call(this, id, "IF", loc, children);
   this.not = not;
   this.func = func;
   this.exprs = exprs;
}

If.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.If = If;

If.prototype.clone = function() {
   return new If(this.id, this.loc, this.not, this.func, this.exprs,
		 this.clone_children())
}

function Sequence(id, loc, children) {
   ASTNode.call(this, id, "SEQUENCE", loc, children);
}

Sequence.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Sequence = Sequence;

Sequence.prototype.clone = function() {
   return new Sequence(this.id, this.loc, this.clone_children());
}

/* sigs_assoc must be checked before the call of this constructor,
   see lang.js */

function Run(id, loc, ast, sigs_assoc) {
   var runnable_ast = null;

   this.sigs_assoc = sigs_assoc;
   this.ast = ast;

   /* TODO: link signals */

   ASTNode.call(this, id, "RUN", loc, this.runnable_ast);

}

Run.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Run = Run;

Run.prototype.clone = function() {
   return new Run(this.id, this.loc, this.ast, this.sigs_assoc);
}

function Signal(id,
		name,
		loc,
		children,
		signal_name,
		type,
		init_value,
		combine_with,
		valued) {
   ASTNode.call(this, id, name, loc, children);
   this.signal_name = signal_name;
   this.type = type;
   this.init_value = init_value;
   this.combine_with = combine_with;
   this.valued = valued;
}

Signal.prototype = new ASTNode(undefined, undefined, undefined, undefined);

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
	       "LOCALSIGNAL",
	       loc,
	       children,
	       signal_name,
	       type,
	       init_value,
	       combine_with,
	       valued);
}

LocalSignal.prototype = new Signal(undefined, undefined, undefined, undefined,
				   undefined, undefined, undefined, undefined,
				   undefined);

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
	       "INPUTSIGNAL",
	       loc,
	       undefined,
	       signal_name,
	       type,
	       init_value,
	       combine_with,
	       valued);
}

InputSignal.prototype = new Signal(undefined, undefined, undefined, undefined,
				   undefined, undefined, undefined, undefined,
				   undefined);

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
	       "OUTPUTSIGNAL",
	       loc,
	       undefined,
	       signal_name,
	       type,
	       init_value,
	       combine_with,
	       valued);
}

OutputSignal.prototype = new Signal(undefined, undefined, undefined, undefined,
				    undefined, undefined, undefined, undefined,
				    undefined);

exports.OutputSignal = OutputSignal;

OutputSignal.prototype.clone = function() {
   return new OutputSignal(this.loc, this.signal_name, this.type,
			   this.init_value, this.combine_with, this.valued);
}
