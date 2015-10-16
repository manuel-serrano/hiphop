"use strict"

/* TODO
   - factorize circuit run (assignment are very often the sames)
   - test suspend statement
   - remove this.name, except for the machine (we must can get it by objet type)
   - TRAP: check missing K[x]
   - RUN: make clone that support same signal name, rename it, replace it
          so that avoid using a visitor after it to replace signal
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
   this.local = false; /* usefull for DEBUG_REACT only */
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

/* An identifier which refers to a trap, and make the link between an exit
   statement and a trap statement */

function TrapId(name) {
   this.name = name;
   this.trap = null;
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

function Statement(name) {
   this.name = name;
   this.loc = "NESTED";
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

/* Root class of any circuit (construction with statements, or others
   circuits.
   `X_in` represent the connections of the circuit with subcircuit.
   The relations between in/out wires (booleans doors, etc.) which are
   specifics to the circuit, are represented in the code of `run` functions. */

function Circuit(name, subcircuit) {
   Statement.call(this, name);

   if (subcircuit != undefined) // because the inheritance of prototypes
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

/* Circuits with more than one nested subcircuit */

function MultipleCircuit(name, subcircuits) {
   Circuit.call(this, name, subcircuits);
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

function ReactiveMachine(circuit) {
   Circuit.call(this, "REACTIVE_MACHINE", circuit);
   this.seq = -1;
   this.boot_reg = true;
   this.machine_name = "";

   /* used to display input signal which are set on DEBUG_REACT mode */
   this.signals = [];
}

ReactiveMachine.prototype = new Circuit();

ReactiveMachine.prototype.react = function(seq) {
   var go = false;

   if (seq != undefined && seq <= this.seq)
      return;

   if (this.boot_reg) {
      var visitor = new ResetRegisterVisitor();
      this.accept(visitor);
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

      for (var i in this.signals) {
	 var sig = this.signals[i];

	 if (sig.set) {
	    if (sig.emitters == 0) {
	       buf_in += " " + sig.name;
	       semicolon_space = "";
	    }
	    if (sig.emitters > 0 && sig.waiting == 0 && !sig.local)
	       buf_out += " " + sig.name;
	 }
      }

      buf_in += semicolon_space + ";"
      console.log(buf_in);
      console.log(buf_out);
   }

   this.go_in.stmt_out.accept(new ResetSignalVisitor());
   this.reset_react = false;
}

/* Get all signal which are used inside this reactive machine,
   this is usefull only for debug */

ReactiveMachine.prototype.catch_signals = function() {
   var visitor = new EmbeddedSignalsVisitor();
   this.accept(visitor);
   this.signals = visitor.signals;
}

ReactiveMachine.prototype.reset = function() {
   this.boot_reg = true;
   if (DEBUG_FLAGS & DEBUG_REACT) {
      console.log(this.machine_name + "> !reset;");
      console.log("--- Automaton", this.machine_name, "reset");
   }
}

/* Emit - Figure 11.4 page 116 */

function Emit(signal) {
   Statement.call(this, "EMIT");
   this.signal = signal;
   signal.emitters++;
   signal.waiting = signal.emitters;
}

Emit.prototype = new Statement();

Emit.prototype.run = function() {
   this.k[0].set = this.go.set;
   if (this.signal.waiting > 0)
      this.signal.waiting--;
   if (this.go.set)
      this.signal.set = true;

   if (DEBUG_FLAGS & DEBUG_EMIT)
      this.debug();
   return true;
}

/* Pause - Figure 11.3 page 115 */

function Pause() {
   Statement.call(this, "PAUSE");
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
   assert_completion_code(this);
   return true;
}

/* Present test - Figure 11.5 page 117
   X_in[0] represent X_in of then branch
   X_in[1] represent X_in of else branch
   It's allowed to have only a then branch */

function Present(signal, then_branch, else_branch) {
   if (!(else_branch instanceof Statement))
      else_branch = new Nothing();
   MultipleCircuit.call(this, "PRESENT", [then_branch, else_branch]);
   this.signal = signal;

   /* set to 0 or 1 is the branch 0|1 was blocked on signal test */
   this.blocked = -1;
}

Present.prototype = new MultipleCircuit();

Present.prototype.run = function() {
   var branch = 0;
   var signal_state = this.signal.get_state();

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

function Sequence() {
   var subcircuits = null;

   this.seq_len = 0;
   this.blocked = -1 /* same semantic that present blocked attribute */

   if (arguments[0].constructor.name == 'Array') {
      this.seq_len = arguments[0].length;
      subcircuits = arguments[0];
   } else {
      this.seq_len = arguments.length;
      subcircuits = arguments;
   }
   MultipleCircuit.call(this, "SEQUENCE", subcircuits);
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

function Loop(circuit) {
   Circuit.call(this, "LOOP", circuit);
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

function Abort(circuit, signal) {
   Circuit.call(this, "ABORT", circuit);
   this.signal = signal;
}

Abort.prototype = new Circuit();

Abort.prototype.run = function() {
   var signal_state = this.signal.get_state();

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
   assert_completion_code(this);
   return true;
}

/* Await */

function Await(signal) {
   this.signal = signal;
   var abort = new Abort(new Halt(), this.signal);
   Circuit.call(this, "AWAIT", abort);
}

Await.prototype = new Circuit();

Await.prototype.run = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   if (!this.go_in.stmt_out.run())
      return false;

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set;
   this.k[1].set = this.k_in[1].set;

   if (DEBUG_FLAGS & DEBUG_AWAIT)
      this.debug();
   return true;
}

/* Halt */

function Halt() {
   var halt = new Loop(new Pause());
   Circuit.call(this, "HALT", halt);
}

Halt.prototype = new Circuit();

Halt.prototype.run = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   this.go_in.stmt_out.run();

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set;
   this.k[1].set = this.k_in[1].set;

   if (DEBUG_FLAGS & DEBUG_HALT)
      this.debug();
   return true;
}

/* Parallel - Figure 11.10 page 122 */

function Parallel(branch1, branch2) {
   MultipleCircuit.call(this, "PARALLEL", [branch1, branch2]);
}

Parallel.prototype = new MultipleCircuit();

Parallel.prototype.init_internal_wires = function(i, circuit) {
   this.go_in[i] = circuit.go = new Wire(this, circuit);
   this.res_in[i] = circuit.res = new Wire(this, circuit);
   this.susp_in[i] = circuit.susp = new Wire(this, circuit);
   this.kill_in[i] = circuit.kill = new Wire(this, circuit);
   this.sel_in[i] = circuit.sel = new Wire(circuit, this);
}

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
   assert_completion_code(this);
   return true;
}

Parallel.prototype.accept = function(visitor) {
   visitor.visit(this);
   this.go_in[0].stmt_out.accept(visitor);
   this.go_in[1].stmt_out.accept(visitor);
}

/* Nothing statement */

function Nothing () {
   Statement.call(this, "NOTHING")
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

function Atom(func) {
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

function Suspend(circuit, signal) {
   Circuit.call(this, "SUSPEND", circuit);
   this.signal = signal;
}

Suspend.prototype = new Circuit();

Suspend.prototype.run = function() {
   /* TODO: make same hack that abort */
   var signal_state = this.signal.get_state();

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
   assert_completion_code(this);
   return true;
}

/* Trap/Shift - Figure 11.12/11.13 page 124
   When we'll support parallel traps, trapid could be a list of trapid */

function Trap(circuit, trapid) {
   Circuit.call(this, "TRAP", circuit);
   this.trapid = trapid;
   trapid.trap = this;
}

Trap.prototype = new Circuit();

Trap.prototype.build_out_wires = function(circuit) {
   this.sel_in = circuit.sel = new Wire(circuit, this);
   this.k_in = [];
   this.k_in[0] = circuit.k[0] = new Wire(circuit, this);
   this.k_in[1] = circuit.k[1] = new Wire(circuit, this);
   this.k_in[2] = new Wire(null, null); // exit use it to make the trap
   for (var i = 2; i < circuit.k.length; i++)
      this.k_in[i + 1] = circuit.k[i] = new Wire(circuit, this);
}

Trap.prototype.run = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set || this.k_in[2].set;

   this.go_in.stmt_out.run();

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set || this.k_in[2].set;
   this.k[1].set = this.k_in[1].set;
   for (var i = 2; i < this.k.length; i++)
      this.k[i].set = this.k_in[i + 1].set;

   if (DEBUG_FLAGS & DEBUG_TRAP)
      this.debug();
   assert_completion_code(this);
   return true;
}

/* Exit of a trap */

function Exit(trapid) {
   Statement.call(this, "EXIT");
   this.trapid = trapid;
}

Exit.prototype = new Statement();

Exit.prototype.run = function() {
   this.k[0].set = false;
   this.k[1].set = false;
   this.trapid.trap.k_in[2].set = this.go.set;
   return true;
}

/* Run statement
   Its just forward in/out to/from the nested reactive machine
   We have to replace the signal sig_list_callee[i] in the subcircuit by
   the caller signal sig_list_caller[i] */

function Run(machine, sig_list_caller, sig_list_callee) {
   var circuit = deep_clone(machine.go_in.stmt_out);
   Circuit.call(this, "RUN", circuit);

   for (var i in sig_list_caller) {
      var visitor = new OverrideSignalVisitor(sig_list_caller[i],
					      sig_list_callee[i]);
      this.go_in.stmt_out.accept(visitor);
   }
}

Run.prototype = new Circuit();

Run.prototype.run = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;
   this.go_in.stmt_out.run();
   this.sel.set = this.sel_in.set;
   for (var i in this.k_in)
      this.k[i].set = this.k_in[i].set;
   return true;
}

/* Visitor that override the signal sig_old by the signal sig_new */

function OverrideSignalVisitor(sig_new, sig_old) {
   this.sig_new = sig_new;
   this.sig_old = sig_old;
}

OverrideSignalVisitor.prototype.visit = function(stmt) {
   var is_emit = false;
   if ((is_emit = stmt instanceof Emit)
       || stmt instanceof Await
       || stmt instanceof Present
       || stmt instanceof Abort) {
      if (stmt.signal.name == this.sig_old.name) {
	 stmt.signal = this.sig_new;
	 if (is_emit)
	    this.sig_new.emitters++;
      }
   }
}

/* Visitor usefull to reset signal state after reaction */

function ResetSignalVisitor() {
}

ResetSignalVisitor.prototype.visit = function(stmt) {
   if (stmt instanceof Emit
       || stmt instanceof Await
       || stmt instanceof Present
       || stmt instanceof Abort) {
      stmt.signal.set = false;
      stmt.signal.waiting = stmt.signal.emitters;
   }
}

/* Visitor that return all signal embeded */

function EmbeddedSignalsVisitor() {
   this.signals = [];
}

EmbeddedSignalsVisitor.prototype.visit = function(stmt) {
   if (stmt instanceof Emit
       || stmt instanceof Await
       || stmt instanceof Present
       || stmt instanceof Abort) {
      if (this.signals.indexOf(stmt.signal) < 0)
	 this.signals.push(stmt.signal);
   }
}

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

/* Assert that only one completion wire is on */

function assert_completion_code(stmt) {
   var set = false;

   for (var i in stmt.k)
      if (set && stmt.k[i].set)
	 fatal_error("more that one completion code in " + stmt.name);
      else if (stmt.k[i].set)
	 set = true;
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
exports._Statement = Statement;
exports.Trap = Trap;
exports.TrapId = TrapId;
exports.Exit = Exit;
exports.Run = Run;
