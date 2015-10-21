"use hopscript"

function ASTNode(name, loc) {
   this.name = name
   this.loc = loc;
   this.machine = null;
   this.parent = null;
}
ASTNode.prototype.accept = function(visitor) {
   visitor.visit(this);
}
ASTNode.prototype.accept_auto = ASTNode.prototype.accept;
exports.ASTNode = ASTNode;

/* Statements nodes */

function Statement(name, loc) {
   ASTNode.call(this, name, loc);
   this.incarnation_lvl = 0;
}
Statement.prototype = new ASTNode();
exports.Statement = Statement;

function Emit(loc, signal_name) {
   Statement.call(this, "EMIT", loc);
   this.signal_name = signal_name;
}
Emit.prototype = new Statement();
exports.Emit = Emit;

function Nothing(loc) {
   Statement.call(this, "NOTHING", loc);
}
Nothing.prototype = new Statement();
exports.Nothing = Nothing;

function Pause(loc) {
   Statement.call(this, "PAUSE", loc);
}
Pause.prototype = new Statement();
exports.Pause = Pause;

function Exit(loc, trap_name) {
   Statement.call(this, "EXIT", loc);
   this.trap_name = trap_name;
}
Exit.prototype = new Statement();
exports.Exit = Exit;

function Halt(loc) {
   Statement.call(this, "HALT", loc);
}
Halt.prototype = new Statement();
exports.Halt = Halt;

function Atom(loc, func) {
   Statement.call(this, "ATOM", loc);
   this.func = func;
}
Atom.prototype = new Statement();
exports.Atom = Atom;

function Await(loc, signal_name) {
   Circuit.call(this, "AWAIT", loc);
   this.signal_name = signal_name;
}
Await.prototype = new Statement();
exports.Await = Await;

/* Circuit nodes */

function Circuit(name, loc, subcircuit) {
   Statement.call(this, name, loc);
   this.subcircuit = [].concat(subcircuit);
}
Circuit.prototype = new Statement();
Circuit.prototype.accept_auto = function(visitor) {
   visitor.visit(this);
   for (var i in this.subcircuit)
      this.subcircuit[i].accept_auto(visitor);
}
exports.Circuit = Circuit;

function Trap(loc, trap_name, subcircuit) {
   Circuit.call(this, "TRAP", loc, subcircuit);
   this.trap_name = trap_name;
}
Trap.prototype = new Circuit();
exports.Trap = Trap;

function ReactiveMachine(loc,
			 machine_name,
			 input_signals,
			 output_signals,
			 subcircuit) {
   Circuit.call(this, "REACTIVEMACHINE", loc, subcircuit);
   this.machine_name = machine_name;
   this.input_signals = input_signals;
   this.output_signals = output_signals;
}
ReactiveMachine.prototype = new Circuit();
exports.ReactiveMachine = ReactiveMachine;

function Abort(loc, signal_name, subcircuit) {
   Circuit.call(this, "ABORT", loc, subcircuit);
   this.signal_name = signal_name;
}
Abort.prototype = new Circuit();
exports.Abort = Abort;

function Loop(loc, subcircuit) {
   Circuit.call(this, "LOOP", loc, subcircuit);
}
Loop.prototype = new Circuit();
exports.Loop = Loop;

function Suspend(loc, signal_name, subcircuit) {
   Circuit.call(this, "SUSPEND", loc, subcircuit);
   this.signal_name = signal_name;
}
Suspend.prototype = new Circuit();
exports.Suspend = Suspend;

function Parallel(loc, subcircuits) {
   Circuit.call(this, "PARALLEL", loc, subcircuits);
}
Parallel.prototype = new Circuit();
exports.Parallel = Parallel;

function Present(loc, signal_name, subcircuits) {
   Circuit.call(this, "PRESENT", loc, subcircuits);
   this.signal_name = signal_name;
}
Present.prototype = new Circuit();
exports.Present = Present;

function Sequence(loc, subcircuits) {
   Circuit.call(this, "SEQUENCE", loc, subcircuits);
}
Sequence.prototype = new Circuit();
exports.Sequence = Sequence;


/* Signal nodes */

function LocalSignal(loc, signal_name, subcircuit) {
   Circuit.call(this, "LOCALSIGNAL", loc, subcircuit);
   this.signal_name = signal_name;
}
LocalSignal.prototype = new Circuit();
exports.LocalSignal = LocalSignal;

function Signal(debug_name, loc, signal_ref) {
   ASTNode.call(this, debug_name, loc);
   this.signal_ref = signal_ref;
}
Signal.prototype = new ASTNode();
exports.Signal = Signal;

function InputSignal(loc, signal_ref) {
   Signal.call(this, "INPUTSIGNAL", loc, signal_ref);
}
InputSignal.prototype = new Signal();
exports.InputSignal = InputSignal;

function OutputSignal(loc, signal_ref) {
   Signal.call(this, "OUTPUTSIGNAL", loc, signal_ref);
}
OutputSignal.prototype = new Signal();
exports.OutputSignal = OutputSignal;
