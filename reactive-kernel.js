"use hopscript"

/* TODO
   - test suspend statement
   - remove this.name, except for the machine (we must can get it by objet type)
*/

var DEBUG_NONE = 0;
var DEBUG_EMIT = 1;
var DEBUG_PAUSE = 2;
var DEBUG_PRESENT = 4;
var DEBUG_SEQUENCE = 8;
var DEBUG_LOOP = 16;
var DEBUG_ABORT = 32;
var DEBUG_HALT = 64;
var DEBUG_AWAIT = 128;
var DEBUG_PARALLEL = 256;
var DEBUG_SUSPEND = 1024;
var DEBUG_REACT = 2048;
var DEBUG_TRAP = 4096;
var DEBUG_ALL = 0xFFFFFFFF;
var DEBUG_FLAGS = DEBUG_NONE;

 DEBUG_FLAGS |= DEBUG_REACT;
// DEBUG_FLAGS |= DEBUG_PARALLEL;
// DEBUG_FLAGS |= DEBUG_ABORT;
// DEBUG_FLAGS |= DEBUG_AWAIT;
// DEBUG_FLAGS |= DEBUG_LOOP;
// DEBUG_FLAGS |= DEBUG_PRESENT;
// DEBUG_FLAGS |= DEBUG_PAUSE;
// DEBUG_FLAGS |= DEBUG_HALT;
// DEBUG_FLAGS |= DEBUG_SUSPEND;
// DEBUG_FLAGS |= DEBUG_TRAP;

function Signal(name, value) {
   /* value == false: pure signal
      value != false: valued signal */

   this.name = name;
   this.set = false;
   this.value = false;
   this.emitters = 0; /* number of emitters in the program code */
   this.waiting = 0; /* number of waiting emitters for the current reaction */
}

/* 2: the signal is set and its value is ready to read
   1: the signal is set
   0: the value is unkown
   -1: the value is unset */

Signal.prototype.get_state = function() {
   if (this.waiting == 0 && this.set)
      return 2;
   if (this.set)
      return 1;
   if (this.waiting > 0)
      return 0;
   return -1;
}

/* Set the value of a signal from host language, before the begining
   of an execution */

Signal.prototype.set_from_host = function (set, value) {
   if (value != null || value != undefined) {
      this.value = value;
      this.set = set;
      this.waiting = this.emitters;
   } else {
      this.set = set;
      this.waiting = 0;
   }
}

Signal.prototype.incr_emitters = function() {
   this.emitters++;
   this.waiting = this.emitters;
}

Signal.prototype.reset = function() {
   this.set = false;
   this.waiting = this.emitters;
}

/* A wire connect two statements.
   The `set` attribute, contains the status (1 or 0) of the wire */

function Wire(stmt_in, stmt_out) {
   this.stmt_in = stmt_in;
   this.stmt_out = stmt_out;
   this.set = false;
}

/* Root class of any kernel statement. Theses properties representes the
   connections to others circuits */

function Statement(machine, loc, name) {
   this.name = name;
   this.debug_code;
   this.loc = loc;
   this.machine = machine;
   this.go = null;
   this.res = null;
   this.susp = null;
   this.kill = null;
   this.sel = null;

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.k = [null, null];
}

/* Standard terminaison of run(): true
   Blocked on signal test: false */

Statement.prototype.run = function() { return true; }

/* Generic debug function can be called after the execution of a statement */

Statement.prototype.debug = function() {
   var return_codes = "";

   for (var i in this.k) {
      return_codes += "K" + i + ":" + this.k[i].set;
      if (i - 1 < this.k.length)
	 return_codes += " ";
   }

   console.log("*** DEBUG", this.name, "at", this.loc, "*** \n   ",
	       "GO:" + this.go.set,
	       "RES:" + this.res.set,
	       "SUSP:" + this.susp.set,
	       "KILL:" + this.kill.set,
	       "SEL:" + this.sel.set,
	       return_codes);
}

/* Visitor pattern for some stuff (init signals at the end of
   computation, sorting, etc) */

Statement.prototype.accept = function(visitor) {
   visitor.visit(this);
}

Statement.prototype.assert_completion_code = function() {
   var set = false;

   for (var i in this.k)
      if (set && this.k[i].set)
	 fatal_error("more that one completion code in " + this.name);
      else if (this.k[i].set)
	 set = true;
}

/* Root class of any circuit (construction with statements, or others
   circuits.
   `X_in` represent the connections of the circuit with subcircuit.
   The relations between in/out wires (booleans doors, etc.) which are
   specifics to the circuit, are represented in the code of `run` functions. */

function Circuit(machine, loc, name, subcircuit) {
   Statement.call(this, machine, loc, name);

   if (subcircuit != undefined && subcircuit != null)
      this.build_wires(subcircuit);
}

Circuit.prototype = new Statement();

Circuit.prototype.accept = function(visitor) {
   visitor.visit(this);
   this.go_in.stmt_out.accept(visitor);
}

Circuit.prototype.build_wires = function(circuit) {
   this.build_in_wires(circuit);
   this.build_out_wires(circuit);
}

Circuit.prototype.build_in_wires = function(circuit) {
   this.go_in = circuit.go = new Wire(this, circuit);
   this.res_in = circuit.res = new Wire(this, circuit);
   this.susp_in = circuit.susp = new Wire(this, circuit);
   this.kill_in = circuit.kill = new Wire(this, circuit);
}

Circuit.prototype.build_out_wires = function(circuit) {
   this.sel_in = circuit.sel = new Wire(circuit, this);
   this.k_in = [];
   for (var i in circuit.k) {
      if (this.k[i] == undefined)
	 this.k[i] = null;
      this.k_in[i] = circuit.k[i] = new Wire(circuit, this);
   }
}

Circuit.prototype.run = function() {
   this.set_subcircuit_in();
   if (!this.go_in.stmt_out.run())
      return false;
   this.set_subcircuit_out();
   if (DEBUG_FLAGS & this.debug_code)
      this.debug();
   this.assert_completion_code();
   return true;
}

Circuit.prototype.set_subcircuit_in = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp.set = this.susp.set;
   this.kill_in.set = this.kill.set;
}

Circuit.prototype.set_subcircuit_out = function() {
   this.sel.set = this.sel_in.set;
   for (var i in this.k)
      this.k[i].set = this.k_in[i].set;
}

/* Circuits with more than one nested subcircuit */

function MultipleCircuit(machine, loc, name, subcircuits) {
   Circuit.call(this, machine, loc, name, subcircuits);
}

MultipleCircuit.prototype = new Circuit();

MultipleCircuit.prototype.build_wires = function(subcircuits) {
   this.go_in = [];
   this.res_in = [];
   this.susp_in = [];
   this.kill_in = [];
   this.sel_in = [];
   this.k_in = [];

   for (var i in subcircuits) {
      this.build_in_wires(subcircuits[i], i);
      this.build_out_wires(subcircuits[i], i);
   }
}

MultipleCircuit.prototype.build_in_wires = function(circuit, i) {
   this.go_in[i] = circuit.go = new Wire(this, circuit);
   this.res_in[i] = circuit.res = new Wire(this, circuit);
   this.susp_in[i] = circuit.susp = new Wire(this, circuit);
   this.kill_in[i] = circuit.kill = new Wire(this, circuit);
}

MultipleCircuit.prototype.build_out_wires = function(circuit, j) {
   this.sel_in[j] = circuit.sel = new Wire(circuit, this);
   for (var i in circuit.k) {
      if (this.k_in[i] == undefined)
	 this.k_in[i] = [];
      if (this.k[i] == undefined)
	 this.k[i] = null;
      this.k_in[i][j] = circuit.k[i] = new Wire(circuit, this);
   }
}

function ReactiveMachine(loc, machine_name) {
   Circuit.call(this, null, loc, "REACTIVE_MACHINE", null);
   this.seq = -1;
   this.boot_reg = true;
   this.machine_name = machine_name;
   this.local_signals = {};
   this.input_signals = {};
   this.output_signals = {};
}

ReactiveMachine.prototype = new Circuit();

ReactiveMachine.prototype.react = function(seq) {
   var go = false;

   if (seq <= this.seq)
      return;

   if (this.boot_reg) {
      this.go_in.stmt_out.accept(new ResetRegisterVisitor());
      go = this.boot_reg;
      this.boot_reg = false;
   }

   this.go_in.set = go;
   this.res_in.set = true;
   this.susp_in.set = false;
   this.kill_in.set = false;

   if (!this.go_in.stmt_out.run())
      fatal_error("sequential causality");

   if (DEBUG_FLAGS & DEBUG_REACT) {
      var buf_in = this.machine_name + ">";
      var buf_out = "--- Output:";
      var semicolon_space = " ";

      for (var i in this.input_signals) {
	 var sig = this.input_signals[i];

	 if (sig.set) {
	       buf_in += " " + sig.name;
	       semicolon_space = "";
	 }
      }

      for (var i in this.output_signals) {
	 var sig = this.output_signals[i];

	 if (sig.waiting == 0 && sig.set)
	       buf_out += " " + sig.name;
      }

      buf_in += semicolon_space + ";"
      console.log(buf_in);
      console.log(buf_out);
   }

   for (var i in this.input_signals)
      this.input_signals[i].reset();

   for (var i in this.output_signals)
      this.output_signals[i].reset();

   for (var i in this.local_signals)
      for (var j in this.local_signals[i])
	 this.local_signals[i][j].reset();

   this.reset_react = false;
}

ReactiveMachine.prototype.reset = function() {
   this.boot_reg = true;

   if (DEBUG_FLAGS & DEBUG_REACT) {
      console.log(this.machine_name + "> !reset;");
      console.log("--- Automaton", this.machine_name, "reset");
   }
}

ReactiveMachine.prototype.run = function() {
   fatal_error("call run() on ReactiveMachine");
}

ReactiveMachine.prototype.get_signal = function(name) {
   if (this.local_signals[name])
      return this.local_signals[name][0];
   if (this.input_signals[name])
      return this.input_signals[name];
   if (this.output_signals[name])
      return this.output_signals[name];
   fatal_error("Unkown signal " + name);
}

/* Emit - Figure 11.4 page 116 */

function Emit(machine, loc, signal_name) {
   Statement.call(this, machine, loc, "EMIT");
   this.debug_code = DEBUG_EMIT;
   this.signal_name = signal_name;
   this.machine.get_signal(signal_name).incr_emitters();
}

Emit.prototype = new Statement();

Emit.prototype.run = function() {
   var signal = this.machine.get_signal(this.signal_name);

   this.k[0].set = this.go.set;
   if (signal.waiting > 0)
      signal.waiting--;
   if (this.go.set)
      signal.set = true;

   if (DEBUG_FLAGS & DEBUG_EMIT)
      this.debug();
   return true;
}

/* Pause - Figure 11.3 page 115 */

function Pause(machine, loc) {
   Statement.call(this, machine, loc, "PAUSE");
   this.debug_code = DEBUG_PAUSE;
   this.reg = false;
}

Pause.prototype = new Statement()

Pause.prototype.run = function() {
   this.k[0].set = this.reg && this.res.set && !this.kill.set;
   this.k[1].set = this.go.set;
   this.reg = (this.go.set || (this.susp.set && this.reg)) && !this.kill.set;
   this.sel.set = this.reg;

   if (DEBUG_FLAGS & DEBUG_PAUSE)
      this.debug();
   this.assert_completion_code();
   return true;
}

/* Present test - Figure 11.5 page 117
   X_in[0] represent X_in of then branch
   X_in[1] represent X_in of else branch
   It's allowed to have only a then branch */

function Present(machine, loc, signal_name, then_branch, else_branch) {
   if (!(else_branch instanceof Statement))
      else_branch = new Nothing();
   MultipleCircuit.call(this, machine, loc, "PRESENT",
			[then_branch, else_branch]);
   this.debug_code = DEBUG_PRESENT;
   this.signal_name = signal_name;

   /* set to 0 or 1 is the branch 0|1 was blocked on signal test */
   this.blocked = -1;
}

Present.prototype = new MultipleCircuit();

Present.prototype.run = function() {
   var branch = 0;
   var signal = this.machine.get_signal(this.signal_name);
   var signal_state = signal.get_state();

   if (this.blocked == -1) {
      if (signal_state == 0)
	 return false;

      this.go_in[0].set = this.go.set && signal_state > 0;
      this.go_in[1].set = this.go.set && !(signal_state > 0);

      /* initialize states of k outputs of present from the previous reaction */
      for (var i in this.k)
	 this.k[i].set = false;
   } else {
      branch = this.blocked;
      this.blocked = -1;
   }

   for (; branch < 2; branch++) {
      this.res_in[branch].set = this.res.set;
      this.susp_in[branch].set = this.susp.set;
      this.kill_in[branch].set = this.kill.set;

      if (!this.go_in[branch].stmt_out.run()) {
	 this.blocked = branch;
	 return false;
      }

      this.sel.set = this.sel.set || this.sel_in[branch].set;
      for (var i in this.k_in)
	 this.k[i].set = (this.k[i].set ||
			  (this.k_in[i][branch] == undefined ?
			   false : this.k_in[i][branch].set));
   }

   if (DEBUG_FLAGS & DEBUG_PRESENT)
      this.debug();
   return true;
}

Present.prototype.accept = function(visitor) {
   visitor.visit(this);
   this.go_in[0].stmt_out.accept(visitor);
   this.go_in[1].stmt_out.accept(visitor);
}

/* Sequence - Figure 11.8 page 120
   It can take either a variable list of argument, or only one argument
   which is an array of statements */

function Sequence(machine, loc, subcircuits) {
   this.seq_len = subcircuits.length;
   this.blocked = -1 /* same semantic that present blocked attribute */
   MultipleCircuit.call(this, machine, loc, "SEQUENCE", subcircuits);
   this.debug_code = DEBUG_SEQUENCE;
}

Sequence.prototype = new MultipleCircuit();

Sequence.prototype.build_wires = function(subcircuits) {
   this.go_in = [];
   this.res_in = [];
   this.susp_in = [];
   this.kill_in = [];
   this.sel_in = [];
   this.k_in = [null, []];

   this.k_in[0] = subcircuits[this.seq_len - 1].k[0] =
      new Wire(subcircuits[this.seq_len - 1], this);

   for (var i = 0; i < this.seq_len; i++) {
      var circuit_cur = subcircuits[i];

      if (i == 0) {
	 this.go_in[i] = circuit_cur.go = new Wire(this, circuit_cur);
      } else {
	 var w = new Wire(subcircuits[i - 1], circuit_cur);

	 this.go_in[i] = w;
	 this.k_in[0][i - 1] = w;
	 subcircuits[i - 1].k[0] = w;
	 circuit_cur.go = w;
      }
      this.res_in[i] = circuit_cur.res = new Wire(this, circuit_cur);
      this.susp_in[i] = circuit_cur.susp = new Wire(this, circuit_cur);
      this.kill_in[i] = circuit_cur.kill = new Wire(this, circuit_cur);
      this.sel_in[i] = circuit_cur.sel = new Wire(circuit_cur, this);

      for (var j = 1; j < circuit_cur.k.length; j++) {
	 if (this.k_in[j] == undefined) {
	    this.k_in[j] = [];
	    this.k[j] = null; /* If we plug a circuit after this one, we have
				 to know there is more than 2 K outputs, and
				 connect it */
	 }
	 this.k_in[j][i] = circuit_cur.k[j] = new Wire(circuit_cur, this);
      }
   }
}

Sequence.prototype.run = function() {
   var s = 0;

   if (this.blocked == -1) {
      /* init circuits outputs */
      this.sel.set = false;
      for (var i in this.k)
	 this.k[i].set = false;
   } else {
      s = this.blocked;
      this.blocked = -1;
   }

   for (; s < this.seq_len; s++) {
      /* init subcircuits inputs */
      this.go_in[s].set = s == 0 ? this.go.set : this.k_in[0][s - 1].set;
      this.res_in[s].set = this.res.set;
      this.susp_in[s].set = this.susp.set;
      this.kill_in[s].set = this.kill.set;

      if (!this.go_in[s].stmt_out.run()) {
	 this.blocked = s;
	 return false;
      }
   }

   /* boolean OR of return codes > 0 and sel
      `i` is an id of statement
      `j` is an id of return code */
   for (var i = 0; i < this.seq_len; i++) {
      this.sel.set = this.sel.set || this.sel_in[i].set;
      for (var j = 1; j < this.k_in.length; j++) {
	 if (this.k[j] != undefined && this.k[j][i] != undefined) {
	    this.k[j].set = this.k[j].set || this.k_in[j][i].set;
	 }
      }
   }

   this.k[0].set = this.k_in[0].set;

   if (DEBUG_FLAGS & DEBUG_SEQUENCE)
      this.debug();
   return true;
}

Sequence.prototype.accept = function(visitor) {
   visitor.visit(this);
   for (var i in this.go_in)
      this.go_in[i].stmt_out.accept(visitor);
}

/* Loop - Figure 11.9 page 121 */

function Loop(machine, loc, circuit) {
   Circuit.call(this, machine, loc, "LOOP", circuit);
   this.debug_code = DEBUG_LOOP;
}

Loop.prototype = new Circuit();

Loop.prototype.run = function() {
   var stop = false;

   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   while (!stop) {
      this.go_in.set = this.go.set || this.k_in[0].set;
      if (!this.go_in.stmt_out.run())
	 return false;
      // stop = !(this.k_in[0].set && (this.res.set && this.sel.set));
      stop = !this.k_in[0].set;
   }

   this.sel.set = this.sel_in.set;
   this.k[0].set = false;
   for (var i = 1; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_LOOP)
      this.debug();

   return true;
}

/* Abort - Figure 11.7 page 120 */

function Abort(machine, loc, circuit, signal_name) {
   Circuit.call(this, machine, loc, "ABORT", circuit);
   this.debug_code = DEBUG_ABORT;
   this.signal_name = signal_name;
}

Abort.prototype = new Circuit();

Abort.prototype.run = function() {
   var signal = this.machine.get_signal(this.signal_name);
   var signal_state = signal.get_state();

   if (signal_state == 0) {
      this.blocked_by_signal = true;
      return false;
   }

   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set && this.sel.set && !(signal_state > 0);
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   if (!this.go_in.stmt_out.run())
      return false;

   var new_sel = this.sel_in.set;

   this.k[0].set = ((this.res.set &&
		     this.sel.set &&
		     signal_state > 0) ||
		    this.k_in[0].set);
   this.sel.set = new_sel;
   for (var i = 1; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_ABORT)
      this.debug();
   this.assert_completion_code();
   return true;
}

/* Await */

function Await(machine, loc, signal_name) {
   this.signal_name = signal_name;
   var abort = new Abort(machine,
			 loc,
			 new Halt(machine, loc),
			 this.signal_name);
   Circuit.call(this, machine, loc, "AWAIT", abort);
   this.debug_code = DEBUG_AWAIT;
}

Await.prototype = new Circuit();

/* Halt */

function Halt(machine, loc) {
   var halt = new Loop(machine, loc, new Pause(machine, loc));
   Circuit.call(this, machine, loc, "HALT", halt);
   this.debug_code = DEBUG_HALT;
}

Halt.prototype = new Circuit();

/* Parallel - Figure 11.10 page 122 */

function Parallel(machine, loc, branch1, branch2) {
   MultipleCircuit.call(this, machine, loc, "PARALLEL", [branch1, branch2]);
   this.debug_code = DEBUG_PARALLEL;
}

Parallel.prototype = new MultipleCircuit();

Parallel.prototype.run = function() {
   var lend = false;
   var rend = false;

   this.go_in[0].set = this.go_in[1].set = this.go.set;
   this.res_in[0].set = this.res_in[1].set = this.res.set;
   this.susp_in[0].set = this.susp_in[1].set = this.susp.set;
   this.kill_in[0].set = this.kill_in[1].set = this.kill.set;

   while (!lend || !rend) {
      if (!lend)
	 lend = this.go_in[0].stmt_out.run();
      if (!rend)
      	 rend = this.go_in[1].stmt_out.run();
   }

   this.sel.set = this.sel_in[0].set || this.sel_in[1].set;

   var max_code = -1;
   for (var i in this.k) {
      if (this.k_in[i][0].set || this.k_in[i][1].set)
   	 max_code = parseInt(i);
      this.k[i].set = false;
   }

   if (max_code > -1)
   	this.k[max_code].set = true;

   if (DEBUG_FLAGS & DEBUG_PARALLEL)
      this.debug();
   this.assert_completion_code();
   return true;
}

Parallel.prototype.accept = function(visitor) {
   visitor.visit(this);
   this.go_in[0].stmt_out.accept(visitor);
   this.go_in[1].stmt_out.accept(visitor);
}

/* Nothing statement */

function Nothing (machine, loc) {
   Statement.call(this, machine, loc, "NOTHING");
}

Nothing.prototype = new Statement();

Nothing.prototype.run = function() {
   this.k[0].set = this.go.set;
   return true;
}

function remove_duplicates(arr) {
   var seen = {};
   var out = [];
   for (var i = 0; i < arr.length; i++)
      if (seen[arr[i]] != 1) {
	 seen[arr[i]] = 1;
	 out.push(arr[i]);
      }
   return out;
}

/* Atom - execute an host function with no arguments */

function Atom(machine, loc, func) {
   Statement.call(this, machine, loc, "ATOM");
   this.func = func;
}

Atom.prototype = new Statement();

Atom.prototype.run = function() {
   this.k[0].set = this.go.set;
   if (this.go.set)
      this.func();
   return true;
}

/* Suspend - Figure 11.6 */

function Suspend(machine, loc, circuit, signal_name) {
   Circuit.call(this, machine, loc, "SUSPEND", circuit);
   this.debug_code = DEBUG_SUSPEND;
   this.signal_name = signal_name;
}

Suspend.prototype = new Circuit();

Suspend.prototype.run = function() {
   /* TODO: make same hack that abort */
   var signal = this.machine.get_signal(this.signal_name);
   var signal_state = signal.get_state();

   if (signal_state == 0) {
      this.blocked_by_signal = true;
      return false;
   }

   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set && !(signal_state > 0);
   this.susp_in.set = this.susp.set || (this.res.set &&
					this.sel.set &&
					signal_state > 0);
   this.kill_in.set = this.kill.set;

   if (!this.go_in.stmt_out.run())
      return false;

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set;
   this.k[1].set = ((this.res.set &&
		     this.sel.set &&
		     signal_state > 0) ||
		    this.k_in[1].set);
   for (var i = 2; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_SUSPEND)
      this.debug();
   this.assert_completion_code();
   return true;
}

/* Trap/Shift - Figure 11.12/11.13 page 124 */

function Trap(machine, loc, circuit, trap_name) {
   Circuit.call(this, machine, loc, "TRAP", circuit);
   this.debug_code = DEBUG_TRAP;
   this.trap_name = trap_name;
}

Trap.prototype = new Circuit();

Trap.prototype.build_out_wires = function(circuit) {
   this.sel_in = circuit.sel = new Wire(circuit, this);
   this.k_in = [];
   this.k_in[0] = circuit.k[0] = new Wire(circuit, this);
   this.k_in[1] = circuit.k[1] = new Wire(circuit, this);
   this.k_in[2] = new Wire(null, null); // exit use it to make the trap
   for (var i = 2; i < circuit.k.length; i++) {
      if (this.k[i - 1] == undefined)
	 this.k[i - 1] = null;
      this.k_in[i + 1] = circuit.k[i] = new Wire(circuit, this);
   }
}

Trap.prototype.run = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set //|| this.k_in[2].set;

   this.go_in.stmt_out.run();

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set || this.k_in[2].set;
   this.k[1].set = this.k_in[1].set;
   for (var i = 2; i < this.k.length; i++)
      this.k[i].set = this.k_in[i + 1].set;

   if (DEBUG_FLAGS & DEBUG_TRAP)
      this.debug();
   this.assert_completion_code();
   return true;
}

/* Exit of a trap */

function Exit(machine, loc, trap_name) {
   Statement.call(this, machine, loc, "EXIT");
   this.trap_name = trap_name;
}

Exit.prototype = new Statement();

Exit.prototype.run = function() {
   this.k[0].set = false;
   this.k[1].set = false;
   this.k[this.return_code].set = true;
   return true;
}

/* Local signal idenfifier (not instances) which embeded circutis */
function LocalSignalIdentifier(machine, loc, subcircuit, signal_name) {
   Circuit.call(this, machine, loc, "LOCALSIGNALIDENTIFIER", subcircuit);
   this.signal_name = signal_name;
}

LocalSignalIdentifier.prototype = new Circuit();

/* Visitor that reset register */

function ResetRegisterVisitor() {
}

ResetRegisterVisitor.prototype.visit = function(stmt) {
   if (stmt instanceof Pause) {
      stmt.reg = false;
   }

   /* The SEL wire of Abort could be setted by a Pause for the next reaction
      (the new value given by the register, on next clock), so we must
      reset it */
   if (stmt instanceof Abort) {
      stmt.sel.set = false;
   }
}

function fatal_error(msg) {
   console.log("*** ERROR:", msg, "***");
   process.exit(1);
}

function deep_clone(obj) {
   function _clone(obj, cloned, clones) {
      if (!(obj instanceof Object))
	 return obj;

      var cloned_i = cloned.indexOf(obj);
      if (cloned_i > -1)
	 return clones[cloned_i];

      var cpy;
      if (obj instanceof Array)
	 cpy = [];
      else
	 cpy = Object.create(Object.getPrototypeOf(obj));

      cloned_i = cloned.length;
      cloned[cloned_i] = obj;
      clones[cloned_i] = cpy;

      for (var i in obj)
	 if (!(obj[i] instanceof Function))
	    cpy[i] = _clone(obj[i], cloned, clones);

      return cpy;
   }

   return _clone(obj, [], []);
}

exports.Signal = Signal;
exports.Emit = Emit;
exports.Pause = Pause;
exports.Present = Present;
exports.Sequence = Sequence;
exports.Loop = Loop;
exports.Abort = Abort;
exports.Await = Await;
exports.Halt = Halt;
exports.Parallel = Parallel;
exports.Nothing = Nothing;
exports.Atom = Atom;
exports.Suspend = Suspend;
exports.ReactiveMachine = ReactiveMachine;
exports.Statement = Statement;
exports.Trap = Trap;
exports.Exit = Exit;
exports.LocalSignalIdentifier = LocalSignalIdentifier;
