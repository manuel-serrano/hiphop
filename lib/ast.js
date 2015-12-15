"use hopscript"

var rk = require("./reactive-kernel.js");

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

function Statement(id, name, loc) {
   /* `machine` is ast.ReactiveMachine when building the AST and work on it,
      but it must be changed by a rk.ReactiveMachine when factory() is called */

   ASTNode.call(this, name, loc);
   this.id = id;
   this.incarnation_lvl = 0;
}
Statement.prototype = new ASTNode(undefined, undefined);
Statement.prototype.factory = function() { /* Return runtine (rk.*)
					      program node of this */ }
exports.Statement = Statement;

function Emit(id, loc, signal_name, func, exprs) {
   Statement.call(this, id, "EMIT", loc);
   this.signal_name = signal_name;
   this.func = func;
   this.exprs = exprs;
}
Emit.prototype = new Statement(undefined, undefined, undefined);
Emit.prototype.factory = function() {
   return new rk.Emit(this.machine,
		      this.id,
		      this.loc,
		      this.signal_name,
		      this.func,
		      this.exprs);
}
exports.Emit = Emit;

function Sustain(id, loc, signal_name, func, exprs) {
   Statement.call(this, id, "SUSTAIN", loc);
   this.signal_name = signal_name;
   this.func = func;
   this.exprs = exprs;
}
Sustain.prototype = new Statement(undefined, undefined, undefined);
Sustain.prototype.factory = function() {
   return new rk.Sustain(this.machine,
			 this.id,
			 this.loc,
			 this.signal_name,
			 this.func,
			 this.exprs);
}
exports.Sustain = Sustain;

function Nothing(id, loc) {
   Statement.call(this, id, "NOTHING", loc);
}
Nothing.prototype = new Statement(undefined, undefined, undefined);
Nothing.prototype.factory = function() {
   return new rk.Nothing(this.machine, this.id, this.loc);
}
exports.Nothing = Nothing;

function Pause(id, loc) {
   Statement.call(this, id, "PAUSE", loc);
   this.k0_on_depth = false;
}
Pause.prototype = new Statement(undefined, undefined, undefined);
Pause.prototype.factory = function() {
   var p = new rk.Pause(this.machine, this.id, this.loc);
   p.k0_on_depth = this.k0_on_depth;
   return p;
}
exports.Pause = Pause;

function Exit(id, loc, trap_name) {
   Statement.call(this, id, "EXIT", loc);
   this.trap_name = trap_name;
   this.return_code = 2;
}
Exit.prototype = new Statement(undefined, undefined, undefined);
Exit.prototype.factory = function() {
   return new rk.Exit(this.machine,
		      this.id,
		      this.loc,
		      this.trap_name,
		      this.return_code);
}
exports.Exit = Exit;

function Halt(id, loc) {
   Statement.call(this, id, "HALT", loc);
}
Halt.prototype = new Statement(undefined, undefined, undefined);
Halt.prototype.factory = function() {
   return new rk.Halt(this.machine, this.id, this.loc);
}
exports.Halt = Halt;

function Atom(id, loc, func) {
   Statement.call(this, id, "ATOM", loc);
   this.func = func;
}
Atom.prototype = new Statement(undefined, undefined, undefined);
Atom.prototype.factory = function() {
   return new rk.Atom(this.machine, this.id, this.loc, this.func);
}
exports.Atom = Atom;

function Await(id, loc, signal_name, test_pre, immediate, count) {
   Circuit.call(this, id, "AWAIT", loc, undefined);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.count = count;
}
Await.prototype = new Statement(undefined, undefined, undefined);
Await.prototype.factory = function() {
   return new rk.Await(this.machine,
		       this.id,
		       this.loc,
		       this.signal_name,
		       this.test_pre,
		       this.immediate,
		       this.count);
}
exports.Await = Await;

/* Circuit nodes */

function Circuit(id, name, loc, subcircuit) {
   /* `subcircuit` is an AST node when building the AST and work on it,
      but it become an rk.Circuit before the call of factory() */
   Statement.call(this, id, name, loc);
   this.subcircuit = [].concat(subcircuit);
}
Circuit.prototype = new Statement(undefined, undefined, undefined);
Circuit.prototype.accept_auto = function(visitor) {
   visitor.visit(this);
   for (var i in this.subcircuit)
      this.subcircuit[i].accept_auto(visitor);
}
exports.Circuit = Circuit;

function Trap(id, loc, trap_name, subcircuit) {
   Circuit.call(this, id, "TRAP", loc, subcircuit);
   this.trap_name = trap_name;
}
Trap.prototype = new Circuit(undefined, undefined, undefined, undefined);
Trap.prototype.factory = function() {
   return new rk.Trap(this.machine,
		      this.id,
		      this.loc,
		      this.subcircuit[0],
		      this.trap_name)
}
exports.Trap = Trap;

function ReactiveMachine(loc,
			 machine_name,
			 auto_react,
			 debug,
			 input_signals,
			 output_signals,
			 subcircuit) {
   Circuit.call(this, undefined, "REACTIVEMACHINE", loc, subcircuit);
   this.machine_name = machine_name;
   this.auto_react = auto_react;
   this.debug = debug;
   this.input_signals = input_signals;
   this.output_signals = output_signals;

   /* usefull only for program composition (see RunVisitor) */
   this.local_signals = [];
   this.trap_names = [];
}
ReactiveMachine.prototype = new Circuit(undefined, undefined, undefined,
					undefined);
exports.ReactiveMachine = ReactiveMachine;

function Abort(id, loc, signal_name, test_pre, immediate, count, subcircuit) {
   Circuit.call(this, id, "ABORT", loc, subcircuit);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.count = count;
}
Abort.prototype = new Circuit(undefined, undefined, undefined, undefined);
Abort.prototype.factory = function() {
   return new rk.Abort(this.machine,
		       this.id,
		       this.loc,
		       this.subcircuit[0],
		       this.signal_name,
		       this.test_pre,
		       this.immediate,
		       this.count);
}
exports.Abort = Abort;

function Loop(id, loc, subcircuit) {
   Circuit.call(this, id, "LOOP", loc, subcircuit);
}
Loop.prototype = new Circuit(undefined, undefined, undefined, undefined);
Loop.prototype.factory = function() {
   return new rk.Loop(this.machine, this.id, this.loc, this.subcircuit[0]);
}
exports.Loop = Loop;

function LoopEach(id, loc, subcircuit, signal_name, test_pre, count) {
   Circuit.call(this, id, "LOOPEACH", loc, subcircuit);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.count = count;
}
LoopEach.prototype = new Circuit(undefined, undefined, undefined, undefined);
LoopEach.prototype.factory = function() {
   return new rk.LoopEach(this.machine,
			  this.id,
			  this.loc,
			  this.subcircuit[0],
			  this.signal_name,
			  this.test_pre,
			  this.count);
}
exports.LoopEach = LoopEach;

function Every(id, loc, subcircuit, signal_name, count, immediate) {
   Circuit.call(this, id, "EVERY", loc, subcircuit);
   this.signal_name = signal_name;
   this.count = count;
   this.immediate = immediate;
}
Every.prototype = new Circuit(undefined, undefined, undefined, undefined);
Every.prototype.factory = function() {
   return new rk.Every(this.machine,
		       this.id,
		       this.loc,
		       this.subcircuit[0],
		       this.signal_name,
		       this.count,
		       this.immediate);
}
exports.Every = Every;

function Suspend(id, loc, signal_name, test_pre, subcircuit) {
   Circuit.call(this, id, "SUSPEND", loc, subcircuit);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}
Suspend.prototype = new Circuit(undefined, undefined, undefined, undefined);
Suspend.prototype.factory = function() {
   return new rk.Suspend(this.machine,
			 this.id,
			 this.loc,
			 this.subcircuit[0],
			 this.signal_name,
			 this.test_pre)
}
exports.Suspend = Suspend;

function Parallel(id, loc, subcircuits) {
   Circuit.call(this, id, "PARALLEL", loc, subcircuits);
}
Parallel.prototype = new Circuit(undefined, undefined, undefined, undefined);
Parallel.prototype.factory = function() {
   return new rk.Parallel(this.machine, this.id, this.loc, this.subcircuit);
}
exports.Parallel = Parallel;

function Present(id, loc, signal_name, test_pre, subcircuits) {
   if (subcircuits[1] == undefined)
      subcircuits[1] = new Nothing(undefined, loc);

   Circuit.call(this, id, "PRESENT", loc, subcircuits);
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}
Present.prototype = new Circuit(undefined, undefined, undefined, undefined);
Present.prototype.factory = function() {
   return new rk.Present(this.machine,
			 this.id,
			 this.loc,
			 this.signal_name,
			 this.test_pre,
			 this.subcircuit[0],
			 this.subcircuit[1]);
}
exports.Present = Present;

function If(id, loc, not, func, exprs, subcircuits) {
   if (subcircuits[1] == undefined)
      subcircuits[1] = new Nothing(undefined, loc);

   Circuit.call(this, id, "IF", loc, subcircuits);
   this.not = not;
   this.func = func;
   this.exprs = exprs;
}
If.prototype = new Circuit(undefined, undefined, undefined, undefined);
If.prototype.factory = function() {
   return new rk.If(this.machine,
		    this.id,
		    this.loc,
		    this.func,
		    this.exprs,
		    this.subcircuit[0],
		    this.subcircuit[1]);
}
exports.If = If;

function Sequence(id, loc, subcircuits) {
   Circuit.call(this, id, "SEQUENCE", loc, subcircuits);
}
Sequence.prototype = new Circuit(undefined, undefined, undefined, undefined);
Sequence.prototype.factory = function() {
   return new rk.Sequence(this.machine, this.id, this.loc, this.subcircuit);
}
exports.Sequence = Sequence;


/* sigs_assoc must be checked before the call of this constructor,
   see xml-compiler */

function Run(id, loc, ast, sigs_assoc) {
   Circuit.call(this, id, "RUN", loc, ast);
   this.sigs_assoc = sigs_assoc;
}
Run.prototype = new Circuit(undefined, undefined, undefined, undefined);
Run.prototype.factory = function() {
   return new rk.Run(this.machine,
		     this.id,
		     this.loc,
		     this.sigs_assoc,
		     this.subcircuit[0]);
}
exports.Run = Run;

/* Signal nodes */

function LocalSignal(id,
		     loc,
		     signal_name,
		     subcircuit,
		     type,
		     init_value,
		     combine_with) {
   if ((init_value != undefined || combine_with != undefined)
       && type == undefined)
      rk.fatal_error("Signal " + signal_name + " must be typed.", loc);

   if (type != undefined && combine_with != undefined)
      rk.check_valued_signal_definition(type, combine_with, signal_name);

   Circuit.call(this, id, "LOCALSIGNAL", loc, subcircuit);
   this.signal_name = signal_name;
   this.type = type;
   this.init_value = init_value;
   this.combine_with = combine_with;
}
LocalSignal.prototype = new Circuit(undefined, undefined, undefined, undefined);
LocalSignal.prototype.factory = function() {
   return new rk.LocalSignalIdentifier(this.machine,
				       this.id,
				       this.loc,
				       this.subcircuit[0],
				       this.signal_name,
				       this.type,
				       this.init_value,
				       this.combine_with);
}
exports.LocalSignal = LocalSignal;

function Signal(debug_name, loc, signal_ref) {
   ASTNode.call(this, debug_name, loc);
   this.signal_ref = signal_ref;
}
Signal.prototype = new ASTNode(undefined, undefined);
exports.Signal = Signal;

function InputSignal(loc, signal_ref) {
   Signal.call(this, "INPUTSIGNAL", loc, signal_ref);
}
InputSignal.prototype = new Signal(undefined, undefined, undefined);
exports.InputSignal = InputSignal;

/* react_functions parameters must be an array (maybe empty) for JS functions */

function OutputSignal(loc, signal_ref, react_functions) {
   Signal.call(this, "OUTPUTSIGNAL", loc, signal_ref);
   this.react_functions = react_functions;
}
OutputSignal.prototype = new Signal(undefined, undefined, undefined);
exports.OutputSignal = OutputSignal;
