"use hopscript"

/* Statements nodes */

function Statement(name, loc, parent, machine) {
   this.name = name
   this.loc = loc;
   this.parent = parent;
   this.machine = machine;
   this.incarnation_lvl;
}
Statement.prototype.accept = function(visitor) {
   visitor.visit(this);
}
exports.Statement = Statement;

function Emit(loc, parent, machine) {
   Statement.call(this, "EMIT", loc, parent, machine);
}
Emit.prototype = new Statement();
exports.Emit = Emit;

function Nothing(loc, parent, machine) {
   Statement.call(this, "NOTHING", loc, parent, machine);
}
Nothing.prototype = new Statement();
exports.Nothing = Nothing;

function Pause(loc, parent, machine) {
   Statement.call(this, "PAUSE", loc, parent, machine);
}
Pause.prototype = new Statement();
exports.Pause = Pause;

function Exit(loc, parent, machine) {
   Statement.call(this, "EXIT", loc, parent, machine);
}
Exit.prototype = new Statement();
exports.Exit = Exit;

function Halt(loc, parent, machine) {
   Statement.call(this, "HALT", loc, parent, machine);
}
Halt.prototype = new Statement();
exports.Halt = Halt;

function Aton(loc, parent, machine) {
   Statement.call(this, "ATOM", loc, parent, machine);
}
Atom.prototype = new Statement();
exports.Atom = Atom;

/* Circuit nodes */

function Circuit(name, loc, parent, machine, subcircuit) {
   Statement.call(this, name, loc, parent, machine);
   this.subcircuit = subcircuit;
}
Circuit.prototype = new Statement();
Circuit.prototype.accept = function(visitor) {
   visitor.visit(this);
   this.subcircuit.accept(visitor);
}
exports.Circuit = Circuit;

function Trap(loc, parent, machine, subcircuit) {
   Circuit.call(this, "TRAP", loc, parent, machine, subcircuit);
}
Trap.prototype = new Circuit();
exports.Trap = Trap;

function ReactiveMachine(loc, parent, machine_name, subcircuit) {
   Circuit.call(this, "REACTIVEMACHINE", loc, parent, machine_name, subcircuit);
}
ReactiveMachine.prototype = new Circuit();
exports.ReactiveMachine = ReactiveMachine;

function Await(loc, parent, machine, subcircuit) {
   Circuit.call(this, "AWAIT", loc, parent, machine, subcircuit);
}
Await.prototype = new Circuit();
exports.Await = Await;

function Abort(loc, parent, machine, subcircuit) {
   Circuit.call(this, "ABORT", loc, parent, machine, subcircuit);
}
Abort.prototype = new Circuit();
exports.Abort = Abort;

function Loop(loc, parent, machine, subcircuit) {
   Circuit.call(this, "LOOP", loc, parent, machine, subcircuit);
}
Loop.prototype = new Circuit();
exports.Loop = Loop;

function Suspend(loc, parent, machine, subcircuit) {
   Circuit.call(this, "SUSPEND", loc, parent, machine, subcircuit);
}
Suspend.prototype = new Circuit();
exports.Suspend = Suspemd;


/* Signal nodes */

function LocalSignal(loc, parent, machine, signal_name, subcircuit) {
   Circuit.call(this, "LOCALSIGNAL", loc, parent, machine, subcircuit);
   this.signal_name = signal_name;
}
LocalSignal.prototype = new Circuit();
exports.LocalSignal = LocalSignal;

function InputSignal(loc, machine, signal_name) {
   this.loc = loc;
   this.machine = machine;
   this.signal_name = signal_name;
}
exports.InputSignal = InputSignal;

function OutputSignal(loc, machine, signal_name) {
   this.loc = loc;
   this.machine = machine;
   this.signal_name = signal_name;
}
exports.OutputSignal = OutputSignal;

/* Multiple circuit nodes */

function MultipleCircuit(name, loc, parent, machine, subcircuit) {
   Circuit.call(this, loc, parent, machine, null);
   delete this.circuit;
   this.subcircuits = subcircuits;
}
MultipleCircuit.prototype = new Circuit();
MultipleCircuit.prototype.accept(visitor) {
   visitor.visit(this)
   for (var i in this.subcircuits)
      this.subcircuits.accept(visitor);
}
exports.MultipleCircuit = MultipleCircuit;

function Parallel(loc, parent, machine, subcircuits) {
   MultipleCircuit.call(this, "PARALLEL", loc, parent, machine, subcircuits);
}
Parallel.prototype = new MultipleCircuit();
exports.Parallel = Parallel;

function Present(loc, parent, machine, subcircuits) {
   MultipleCircuit.call(this, "PRESENT", loc, parent, machine, subcircuits);
}
Present.prototype = new MultipleCircuit();
exports.Present = Present;

function Sequence(loc, parent, machine, subcircuits) {
   MultipleCircuit.call(this, "SEQUENCE", loc, parent, machine, subcircuits);
}
Sequence.prototype = new MultipleCircuit();
exports.Sequence = Sequence;
