"use strict"

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
var DEBUG_PARALLEL_SYNC = 512;
var DEBUG_ALL = 0xFFFFFFFF;

var DEBUG_FLAGS = DEBUG_NONE;

var THEN = 0;
var ELSE = 1;

function Signal(name, value, emit_cb) {
   /* value == false: pure signal
      value != false: valued signal */

   this.name = name;
   this.set = false;
   this.value = false;
   this.emit_cb = emit_cb == undefined ? null : emit_cb;
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
   this.loc = "--";
   this.go = null;
   this.res = null;
   this.susp = null;
   this.kill = null;
   this.sel = null;

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.k = [null, null];
}

Statement.prototype.run = function() { }

Statement.prototype.init_reg = function() { }

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

/* Return an array of signal tested (present/await)
   TODO: remote it, use visitor instead */
Statement.prototype.get_dependencies = function() {
   return [];
}

/* Return true if the branch emit the `signal` signal
   TODO: remot it, use visitor instead */
Statement.prototype.will_emit = function(signal) {
   return false;
};

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

function Circuit(name) {
   Statement.call(this, name);
   this.go_in = null;
   this.res_in = null;
   this.susp_in = null;
   this.kill_in = null;
   this.sel_in = null;
   this.k_in = [null, null];
}

Circuit.prototype = new Statement();

Circuit.prototype.get_dependencies = function() {
   return this.go_in.stmt_out.get_dependencies();
}

Circuit.prototype.will_emit = function(signal) {
   return this.go_in.stmt_out.will_emit(signal);
};

Circuit.prototype.accept = function(visitor) {
   visitor.visit(this);
   this.go_in.stmt_out.accept(visitor);
};

function ReactiveMachine(circuit) {
   Circuit.call(this, "REACTIVE_MACHINE");
   this.seq = -1;
   this.boot_reg = true;

   this.go_in = circuit.go = new Wire(this, circuit);
   this.res_in = circuit.res = new Wire(this, circuit);
   this.susp_in = circuit.susp = new Wire(this, circuit);
   this.kill_in = circuit.kill = new Wire(this, circuit);
   this.sel_in = circuit.sel = new Wire(circuit, this);

   for (var i in circuit.k)
      this.k_in[i] = circuit.k[i] = new Wire(circuit, this);
}

ReactiveMachine.prototype = new Circuit();

ReactiveMachine.prototype.react = function(seq) {
   if (seq == undefined)
      seq = "\b";
   else if (seq <= this.seq)
      return;

   /* init any register in the machine */
   var buf_init = "";

   if (this.boot_reg) {
      buf_init = " INIT";
      this.go_in.stmt_out.init_reg();
   }

   this.go_in.set = this.boot_reg;
   this.res_in.set = !this.boot_reg;
   this.susp_in.set = false;
   this.kill_in.set = false;

   console.log("---- reaction " + seq + " GO:" + this.go_in.set + " RES:"
	       + this.res_in.set + buf_init + " ----");
   this.go_in.stmt_out.run();

   this.boot_reg = this.k_in[0].set;
   this.go_in.stmt_out.accept(new ResetSignalVisitor());

   var buf = "";
   for (var i in this.k_in)
      buf += "K" + i + ":" + this.k_in[i].set + " ";
   console.log("---- SEL:" + this.sel_in.set + " " + buf + "----\n");
}

ReactiveMachine.prototype.get_dependencies = function() {
   return [];
}

ReactiveMachine.prototype.will_emit = function(signal) {
   return false;
}

ReactiveMachine.prototype.accept = function(visitor) {
}

/* Emit - Figure 11.4 page 116 */

function Emit(signal) {
   Statement.call(this, "EMIT");
   this.signal = signal;
}

Emit.prototype = new Statement();

Emit.prototype.run = function() {
   this.k[0].set = this.go.set;
   this.signal.set = this.go.set;
   if (this.go.set)
      this.signal.emit_cb();

   if (DEBUG_FLAGS & DEBUG_EMIT)
      this.debug();
}

Emit.prototype.will_emit = function(signal) {
   return signal == this.signal;
}

/* Pause - Figure 11.3 page 115 */

function Pause() {
   Statement.call(this, "PAUSE");
   this.reg = false;
}

Pause.prototype = new Statement()

Pause.prototype.run = function() {
   var reg = (this.susp.set && this.reg && !this.kill.set)
      || (this.go.set && !this.kill.set)
   this.sel.set = reg;
   this.k[1].set = this.go.set;
   this.k[0].set = this.reg && this.res.set;
   this.reg = reg;

   if (DEBUG_FLAGS & DEBUG_PAUSE)
      this.debug();
}

Pause.prototype.init_reg = function() {
   this.reg = false;
}

/* Present test - Figure 11.5 page 117
   X_in[THEN] represent X_in of then branch
   X_in[ELSE] represent X_in of else branch
   It's allowed to have only a then branch */

function Present(signal, then_branch, else_branch) {
   Circuit.call(this, "PRESENT");
   this.signal = signal;
   this.go_in = [];
   this.res_in = [];
   this.susp_in = [];
   this.kill_in = [];
   this.sel_in = [];
   this.k_in = [];
   this.init_internal_wires(THEN, then_branch);
   if (else_branch != undefined)
      this.init_internal_wires(ELSE, else_branch);
   else this.init_internal_wires(ELSE, new Nothing());
}

Present.prototype = new Circuit();

Present.prototype.init_internal_wires = function(branch, circuit) {
   this.go_in[branch] = circuit.go = new Wire(this, circuit);
   this.res_in[branch] = circuit.res = new Wire(this, circuit);
   this.susp_in[branch] = circuit.susp = new Wire(this, circuit);
   this.kill_in[branch] = circuit.kill = new Wire(this, circuit);
   this.sel_in[branch] = circuit.sel = new Wire(circuit, this);

   for (var i in circuit.k) {
      if (this.k_in[i] == undefined)
	 this.k_in[i] = [];
      if (this.k[i] == undefined)
	 this.k[i] = [];
      this.k_in[i][branch] = circuit.k[i] = new Wire(circuit, this);
   }
}

Present.prototype.run = function() {
   var branch;

   this.k[0].set = false;
   if (!this.go.set)
      return;

   if (this.signal.set)
      branch = THEN;
   else
      branch = ELSE;

   this.go_in[branch].set = this.go.set;
   this.res_in[branch].set = this.res.set;
   this.susp_in[branch].set = this.susp.set;
   this.kill_in[branch].set = this.kill.set;

   this.go_in[branch].stmt_out.run();

   this.sel.set = this.sel_in[branch].set;
   for (var i in this.k_in)
      this.k[i].set = (this.k_in[i][branch] == undefined ?
		       false : this.k_in[i][branch].set);

   if (DEBUG_FLAGS & DEBUG_PRESENT)
      this.debug();
}

Present.prototype.init_reg = function() {
   this.go_in[THEN].stmt_out.init_reg();
   if (this.go_in[ELSE] != undefined)
      this.go_in[ELSE].stmt_out.init_reg();
   this.k[0].stmt_out.init_reg();
}

Present.prototype.get_dependencies = function() {
   return [ this.signal ]
      .concat(this.go_in[0].stmt_out.get_dependencies())
      .concat(this.go_in[1].stmt_out.get_dependencies());
}

Present.prototype.will_emit = function(signal) {
   return this.go_in[0].stmt_out.will_emit(signal)
      || this.go_in[1].stmt_out.will_emit(signal);
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
   Circuit.call(this, "SEQUENCE");
   this.seq_len = 0;
   this.stmts = null;

   if (arguments[0].constructor.name == 'Array') {
      this.seq_len = arguments[0].length;
      this.stmts = arguments[0];
   } else {
      this.seq_len = arguments.length;
      this.stmts = arguments;
   }

   if (this.seq_len == 0)
      return;

   this.go_in = [];
   this.res_in = [];
   this.susp_in = [];
   this.kill_in = [];
   this.sel_in = [];
   this.k_in = [null, []];

   this.k_in[0] = this.stmts[this.seq_len - 1].k[0] =
      new Wire(this.stmts[this.seq_len - 1], this);

   for (var i = 0; i < this.seq_len; i++) {
      var circuit_cur = this.stmts[i];

      if (i == 0) {
	 this.go_in[i] = circuit_cur.go = new Wire(this, circuit_cur);
      } else {
	 var w = new Wire(this.stmts[i - 1], circuit_cur);

	 this.go_in[i] = w;
	 this.k_in[0][i - 1] = w;
	 this.stmts[i - 1].k[0] = w;
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

Sequence.prototype = new Circuit();

Sequence.prototype.run = function() {
   /* init circuits outputs */
   this.sel.set = false;
   for (var i in this.k)
      this.k[i].set = false;

   for (var s in this.stmts) {
      /* init subcircuits inputs */
      this.go_in[s].set = s == 0 ? this.go.set : this.k_in[0][s - 1].set;
      this.res_in[s].set = this.res.set;
      this.susp_in[s].set = this.susp.set;
      this.kill_in[s].set = this.kill.set;

      this.go_in[s].stmt_out.run();
   }

   /* boolean OR of return codes > 0 and sel */
   for (var i = 0; i < this.seq_len; i++) {
      this.sel.set = this.sel.set || this.sel_in[i].set;
      for (var j = 1; j < this.k_in.length; j++) {
	 if (this.k[j] != undefined) {
	    this.k[j].set = this.k[j].set || this.k_in[j][i].set;
	 }
      }
   }

   this.k[0].set = this.k_in[0].set;

   if (DEBUG_FLAGS & DEBUG_SEQUENCE)
      this.debug();
}

Sequence.prototype.init_reg = function() {
   for (var i in this.go_in)
      this.go_in[i].stmt_out.init_reg();
}

Sequence.prototype.get_dependencies = function() {
   var deps = [];

   for (var i in this.go_in)
      deps = deps.concat(this.go_in[i].stmt_out.get_dependencies())
   return deps;
}

Sequence.prototype.will_emit = function(signal) {
   for (var i in this.go_in)
      if (this.go_in[i].stmt_out.will_emit(signal))
	 return true;
   return false;
}

Sequence.prototype.accept = function(visitor) {
   visitor.visit(this);
   for (var i in this.go_in)
      this.go_in[i].stmt_out.accept(visitor);
}

/* Loop - Figure 11.9 page 121 */

function Loop(circuit) {
   Circuit.call(this, "LOOP");
   this.go_in = circuit.go = new Wire(this, circuit);
   this.res_in = circuit.res = new Wire(this, circuit);
   this.susp_in = circuit.susp = new Wire(this, circuit);
   this.kill_in = circuit.kill = new Wire(this, circuit);
   this.sel_in = circuit.sel = new Wire(circuit, this);
   for(var i in circuit.k) {
      this.k_in[i] = circuit.k[i] = new Wire(circuit, this);
      if (this.k[i] == undefined)
	 this.k[i] = null;
   }
}

Loop.prototype = new Circuit();

Loop.prototype.run = function() {
   var stop = false;

   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   while (!stop) {
      this.go_in.set = this.go.set || this.k_in[0].set;
      this.go_in.stmt_out.run();
      this.sel.set = this.sel_in.set;
      this.k[0].set = this.k_in[0].set;
      stop = !this.k_in[0].set;
   }

   for (var i = 1; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_LOOP)
      this.debug();
}

Loop.prototype.init_reg = function() {
   this.go_in.stmt_out.init_reg();
}

/* Abort - Figure 11.7 page 120 */

function Abort(circuit, signal) {
   Circuit.call(this, "ABORT");
   this.signal = signal;
   this.go_in = circuit.go = new Wire(this, circuit);
   this.res_in = circuit.res = new Wire(this, circuit);
   this.susp_in = circuit.susp = new Wire(this, circuit);
   this.kill_in = circuit.kill = new Wire(this, circuit);
   this.sel_in = circuit.sel  = new Wire(circuit, this);
   for (var i in circuit.k) {
      this.k_in[i] = circuit.k[i] = new Wire(circuit, this);
      if (this.k[i] == undefined)
	 this.k[i] = null;
   }
}

Abort.prototype = new Circuit();

Abort.prototype.run = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set && this.sel.set && !this.signal.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;
   this.go_in.stmt_out.run();
   this.sel.set = this.sel_in.set;
   this.k[0].set = (this.res.set && this.signal.set) || this.k_in[0].set;
   for (var i = 1; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_ABORT)
      this.debug();
}

Abort.prototype.init_reg = function() {
   this.go_in.stmt_out.init_reg();
}

/* Await */

function Await(signal) {
   Circuit.call(this, "AWAIT");
   this.signal = signal;
   var abort = new Abort(new Halt(), this.signal);

   this.go_in = abort.go = new Wire(this, abort);
   this.res_in = abort.res = new Wire(this, abort);
   this.susp_in = abort.susp = new Wire(this, abort);
   this.kill_in = abort.kill = new Wire(this, abort);
   this.sel_in = abort.sel = new Wire(abort, this);
   this.k_in[0] = abort.k[0] = new Wire(abort, this);
   this.k_in[1] = abort.k[1] = new Wire(abort, this);
}

Await.prototype = new Circuit();

Await.prototype.run = function() {
   var res = this.res.set && this.sel.set;
   var res_in = res && !this.signal.set;

   this.go_in.set = this.go.set;
   this.res_in.set = res_in;
   this.susp.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   this.go_in.stmt_out.run();

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set || (res && this.signal.set);
   this.k[1].set = this.k_in[1].set;

   if (DEBUG_FLAGS & DEBUG_AWAIT)
      this.debug();
}

Await.prototype.get_dependencies = function() {
   return [this.signal];
}

/* Halt */

function Halt() {
   Circuit.call(this, "HALT");
   var halt = new Loop(new Pause());

   this.go_in = halt.go = new Wire(this, halt);
   this.res_in = halt.res = new Wire(this, halt);
   this.susp_in = halt.susp = new Wire(this, halt);
   this.kill_in = halt.kill = new Wire(this, halt);
   this.sel_in = halt.sel = new Wire(halt, this);
   this.k_in[0] = halt.k[0] = new Wire(halt, this);
   this.k_in[1] = halt.k[1] = new Wire(halt, this);
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
}

/* Parallel - Figure 11.10 page 122 */

function Parallel(branch1, branch2) {
   Circuit.call(this, "PARALLEL");
   this.synchronizer = new ParallelSynchronizer(branch1, branch2);

   /* init wires fron parallel inputs to two parallel branch inputs and sel */
   this.go_in = [];
   this.res_in = [];
   this.susp_in = [];
   this.kill_in = [];
   this.sel_in = [];
   this.init_internal_wires(0, branch1);
   this.init_internal_wires(1, branch2);

   /* init wire from synchronizer outputs to parallel outputs */
   for (var i = 0; i < this.synchronizer.k.length; i++)
      this.k_in[i] = this.synchronizer.k[i] = new Wire(this.synchronizer, this);
}

Parallel.prototype = new Circuit();

Parallel.prototype.init_internal_wires = function(i, circuit) {
   this.go_in[i] = circuit.go = new Wire(this, circuit);
   this.res_in[i] = circuit.res = new Wire(this, circuit);
   this.susp_in[i] = circuit.susp = new Wire(this, circuit);
   this.kill_in[i] = circuit.kill = new Wire(this, circuit);
   this.sel_in[i] = circuit.sel = new Wire(circuit, this);
}

Parallel.prototype.run = function() {
   var sort = null;

   this.go_in[0].set = this.go_in[1].set = this.go.set;
   this.res_in[0].set = this.res_in[1].set = this.res.set;
   this.susp_in[0].set = this.susp_in[1].set = this.susp.set;
   this.kill_in[0].set = this.kill_in[1].set = this.kill.set;

   sort = this.topological_sort();
   this.go_in[sort[0]].stmt_out.run();
   this.go_in[sort[1]].stmt_out.run();

   this.sel.set = this.sel_in[0].set || this.sel_in[1].set;
   this.synchronizer.lem = !(this.go.set || this.sel.set);
   this.synchronizer.rem = !(this.go.set || this.sel.set);
   this.synchronizer.run();

   for (var i in this.synchronizer.k)
      this.k[i].set = this.synchronizer.k[i].set;

   if (DEBUG_FLAGS & DEBUG_PARALLEL)
      this.debug();
}

Parallel.prototype.topological_sort = function() {
   /* TODO : inprove the sort. The example

      present A then emit B end || emit A

      works well, but the example

      [ emit A; present B them emit C end ]
      ||
      [ present A then emit B end ]

      will make a causality error, and it shouldn't. */

   var ldeps = remove_duplicates(this.go_in[0].stmt_out.get_dependencies());
   var rdeps = remove_duplicates(this.go_in[1].stmt_out.get_dependencies());
   var lfirst = false;
   var rfirst = false;
   var ret = [];

   for (var i in ldeps)
      if (this.go_in[1].stmt_out.will_emit(ldeps[i])) {
	 rfirst = true;
	 ret = [1, 0];
	 break;
      }

   for (var i in rdeps)
      if (this.go_in[0].stmt_out.will_emit(rdeps[i])) {
	 lfirst = true;
	 ret = [0, 1];
	 break;
      }

   if (lfirst && rfirst) {
      console.log("*** CAUSALITY ERROR on", this.name, "at", this.loc, "***");
      process.exit(1);
   }

   if (!lfirst && !rfirst)
      ret = [0, 1];

   return ret;
}

Parallel.prototype.get_dependencies = function() {
   return this.go_in[0].stmt_out.get_dependencies()
      .concat(this.go_in[1].stmt_out.get_dependencies());
}

Parallel.prototype.will_emit = function(signal) {
   return this.go_in[0].stmt_out.will_emit(signal)
      || this.go_in[1].stmt_out.will_emit(signal);
}

Parallel.prototype.accept = function(visitor) {
   visitor.visit(this);
   this.go_in[0].stmt_out.accept(visitor);
   this.go_in[1].stmt_out.accept(visitor);
}

/* Parallel synchronizer - Figure 11.11 page 122 */

function ParallelSynchronizer(branch1, branch2) {
   Circuit.call(this, "PARALLEL_SYNCHRONIZER");
   this.lem = false;
   this.rem = false;
   this.k_in = [];
   this.init_internal_wires(0, branch1);
   this.init_internal_wires(1, branch2);
}

ParallelSynchronizer.prototype = new Circuit();

ParallelSynchronizer.prototype.init_internal_wires = function(i, circuit) {
   for (var j in circuit.k) {
      if (this.k_in[j] == undefined) {
	 this.k_in[j] = [];
	 this.k[j] = null;
      }

      this.k_in[j][i] = circuit.k[j] = new Wire(circuit, this);
   }
}

ParallelSynchronizer.prototype.run = function() {
   /* TODO: state of state_X when the two branches has different number
      of completion code */

   var state_left = [this.lem, this.k_in[0][0].set];
   var state_right = [this.rem, this.k_in[0][1].set];

   for (var i in this.k) {
      var OR_left = state_left[0] || state_left[1];
      var OR_right = state_right[0] || state_right[1];
      var OR_return = state_left[1] || state_right[1];

      this.k[i].set = OR_return && OR_left && OR_right;

      state_left[0] = OR_left;
      state_right[0] = OR_right;

      var x = i; /* just because of the wonderfull world of JavaScript... >< */
      x++;
      if (x < this.k.length) {
	 state_left[1] = this.k_in[x][0].set;
	 state_right[1] = this.k_in[x][1].set;
      }
   }

   if (DEBUG_FLAGS & DEBUG_PARALLEL_SYNC)
      this.debug();
}

ParallelSynchronizer.prototype.debug = function() {
   var buf_left = "";
   var buf_right = "";
   var buf_return = "";

   for (var i in this.k_in) {
      if (this.k_in[i][0] != undefined)
	 buf_left += "K-LEFT" + i + ":" + this.k_in[i][0].set + " ";

      if (this.k_in[i][1] != undefined)
	 buf_right += "K-RIGHT" + i + ":" + this.k_in[i][1].set + " ";

      buf_return += "K" + i + ":" + this.k[i].set + " ";
   }

   console.log("*** DEBUG", this.name, "at", this.loc, "***");
   console.log("   ", buf_left);
   console.log("   ", buf_right);
   console.log("   ", buf_return);
}

/* Nothing statement */
function Nothing () {
   Statement.call(this, "NOTHING")
}

Nothing.prototype = new Statement();

Nothing.prototype.run = function() {
   this.k[0].set = this.go.set;
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

/* Visitor usefull to reset signal state after reaction */
function ResetSignalVisitor() {
}

ResetSignalVisitor.prototype.visit = function(stmt) {
   if (stmt instanceof Emit
       || stmt instanceof Await
       || stmt instanceof Present
       || stmt instanceof Abort)
      stmt.signal.set = false;
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
exports.ReactiveMachine = ReactiveMachine;
