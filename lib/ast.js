"use hopscript"

var error = require("./error.js");

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
}

exports.ASTNode = ASTNode;

ASTNode.prototype.accept = function(visitor) {
   visitor.visit(this);
}

ASTNode.prototype.accept_auto = function(visitor) {
   visitor.visit(this);
   for (let i in this.children) {
      this.children[i].accept_auto(this);
   }
}

function Emit(id, loc, signal_name, func, exprs) {
   ASTNode.call(this, id, "EMIT", loc, undefined);
   this.signal_name = signal_name;
   this.func = func;
   this.exprs = exprs;
}

Emit.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Emit = Emit;

function Sustain(id, loc, signal_name, func, exprs) {
   ASTNode.call(this, id, "SUSTAIN", loc, undefined);
   this.signal_name = signal_name;
   this.func = func;
   this.exprs = exprs;
}

Sustain.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Sustain = Sustain;

function Nothing(id, loc) {
   ASTNode.call(this, id, "NOTHING", loc, undefined);
}

Nothing.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Nothing = Nothing;

function Pause(id, loc) {
   ASTNode.call(this, id, "PAUSE", loc, undefined);
   this.new_incarnation_on_k0 = false;
}

Pause.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Pause = Pause;

function Exit(id, loc, trap_name) {
   ASTNode.call(this, id, "EXIT", loc, undefined);
   this.trap_name = trap_name;
   this.return_code = 2;
}

Exit.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Exit = Exit;

function Halt(id, loc) {
   ASTNode.call(this, id, "HALT", loc, undefined);
}

Halt.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Halt = Halt;

function Atom(id, loc, func, exprs) {
   ASTNode.call(this, id, "ATOM", loc, undefined);
   this.func = func;
   this.exprs = exprs;
}

Atom.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Atom = Atom;

function Await(id, loc, signal_name, test_pre, immediate, count) {
   ASTNode.call(this, id, "AWAIT", loc, undefined);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.count = count;
}

Await.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Await = Await;

function Trap(id, loc, trap_name, children) {
   ASTNode.call(this, id, "TRAP", loc, children);
   this.trap_name = trap_name;
}

Trap.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Trap = Trap;

function HipHop(loc, children) {
   ASTNode.call(this, undefined, "HIPHOP", loc, children);
}

HipHop.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.HipHop = HipHop;

function Abort(id,
	       loc,
	       signal_name,
	       test_pre,
	       immediate,
	       weak,
	       count,
	       children) {
   ASTNode.call(this, id, "ABORT", loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.weak = weak;
   this.count = count;
}

Abort.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Abort = Abort;

function Loop(id, loc, children) {
   ASTNode.call(this, id, "LOOP", loc, children);
}

Loop.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Loop = Loop;

function LoopEach(id, loc, children, signal_name, test_pre, count) {
   ASTNode.call(this, id, "LOOPEACH", loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.count = count;
}

LoopEach.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.LoopEach = LoopEach;

function Every(id, loc, children, signal_name, count, immediate) {
   ASTNode.call(this, id, "EVERY", loc, children);
   this.signal_name = signal_name;
   this.count = count;
   this.immediate = immediate;
}

Every.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Every = Every;

function Suspend(id, loc, signal_name, test_pre, children) {
   ASTNode.call(this, id, "SUSPEND", loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}

Suspend.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Suspend = Suspend;

function Parallel(id, loc, children) {
   ASTNode.call(this, id, "PARALLEL", loc, children);
}

Parallel.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Parallel = Parallel;

function Present(id, loc, signal_name, test_pre, children) {
   if (children[1] == undefined)
      children[1] = new Nothing(undefined, loc);

   ASTNode.call(this, id, "PRESENT", loc, children);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}

Present.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Present = Present;

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

function Sequence(id, loc, children) {
   ASTNode.call(this, id, "SEQUENCE", loc, children);
}

Sequence.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Sequence = Sequence;


/* sigs_assoc must be checked before the call of this constructor,
   see xml-compiler */

function Run(id, loc, runnable_machine, sigs_assoc) {
   this.runnable_machine = runnable_machine;
   this.runnable_ast = runnable_machine.go_in.stmt_out.get_ast_node();
   this.runnable_machine.map_signals = {};
   ASTNode.call(this, id, "RUN", loc, this.runnable_ast);
   this.sigs_assoc = sigs_assoc;
}

Run.prototype = new ASTNode(undefined, undefined, undefined, undefined);

exports.Run = Run;

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
