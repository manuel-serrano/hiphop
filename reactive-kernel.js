"use strict"

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

function Statement() {
   this.go = null;
   this.res = null;
   this.susp = null;
   this.kill = null;
   this.sel = null;

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.k = [null, null];
}

Statement.prototype.run = function() { }

/* Root class of any circuit (construction with statements, or others
   circuits.
   `X_in` represent the connections of the circuit with subcircuit.
   The relations between in/out wires (booleans doors, etc.) which are
   specifics to the circuit, are represented in the code of `run` functions. */

function Circuit() {
   Statement.call(this);
   this.go_in = null;
   this.res_in = null;
   this.susp_in = null;
   this.kill_in = null;
   this.sel_in = null;
   this.k_in = [null, null];
}

Circuit.prototype = new Statement();

function ReactiveMachine(circuit) {
   Circuit.call(this);
   this.seq = -1;

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
   if (seq <= this.seq)
      return;

   this.go_in.set = true;
   this.res_in.set = true;
   this.susp_in.set = false;
   this.kill_in.set = false;

   console.log("---- reaction " + seq + " started ----");
   this.go_in.stmt_out.run();

   var buf = "";
   for (var i in this.k_in)
      buf += "K" + i + ":" + this.k_in[i].set + " ";
   console.log("---- SEL:" + this.sel_in.set + " " + buf + "----\n");
}

/* Emit = Figure 11.4 page 116 */

function Emit(signal) {
   Statement.call(this);
   this.signal = signal;
}

Emit.prototype = new Statement();

Emit.prototype.run = function() {
   this.k[0].set = false;
   this.signal.set = false;
   if (!this.go.set)
      return;

   this.signal.set = true;
   if (this.signal.emit_cb)
      this.signal.emit_cb();
   this.k[0].set = true;
}

/* Pause - Figure 11.3 page 115 */

function Pause() {
   Statement.call(this);
   this.reg = false;
}

Pause.prototype = new Statement()

Pause.prototype.run = function() {
   this.k[0].set = false;
   this.k[1].set = false;
   this.sel.set = this.reg;

   if (this.res.set && this.reg) {
      this.reg = false;
      this.k[0].set = true;
   }

   if (this.susp.set && this.sel.set && !this.kill.set)
      this.reg = true;

   if (this.go.set) {
      if (!this.kill.set)
	 this.reg = true;
      this.k[1].set = true;
   }
}

/* Present test - Figure 11.5 page 117
   X_in[THEN] represent X_in of then branch
   X_in[ELSE] represent X_in of else branch
   It's allowed to have only a then branch */

function Present(signal, then_branch, else_branch) {
   Circuit.call(this);
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
}

Present.prototype = new Circuit();

Present.prototype.init_internal_wires = function(branch, circuit) {
   this.go_in[branch] = circuit.go = new Wire(this, circuit);
   this.res_in[branch] = circuit.res = new Wire(this, circuit);
   this.susp_in[branch] = circuit.susp = new Wire(this, circuit);
   this.kill_in[branch] = circuit.kill = new Wire(this, circuit);
   this.sel_in[branch] = circuit.sel = new Wire(circuit, this);

   for (var i in circuit.k) {
      if (this.k_in[i] == undefined) {
	 this.k_in[i] = [];
	 this.k[i] = [];
      }
      this.k_in[i][branch] = circuit.k[i] = new Wire(circuit, this);
   }
}

Present.prototype.run = function() {
   var branch;

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
      this.k[i] = (this.k_in[i][branch] == undefined ?
		   false : this.k_in[i][branch]);
}

/* Sequence - Figure 11.8 page 120 */

function Sequence() {
   Circuit.call(this);
   this.seq_len = arguments.length;
   this.stmts = arguments;

   if (this.seq_len == 0)
      return;

   this.go_in = [];
   this.res_in = [];
   this.susp_in = [];
   this.kill_in = [];
   this.sel_in = [];
   this.k_in = [null, []];

   this.k_in[0] = arguments[this.seq_len - 1].k[0] =
      new Wire(arguments[this.seq_len - 1], this);

   for (var i = 0; i < this.seq_len; i++) {
      var circuit_cur = arguments[i];

      if (i == 0) {
	 this.go_in[i] = circuit_cur.go = new Wire(this, circuit_cur);
      } else {
	 var w = new Wire(arguments[i - 1], circuit_cur);

	 this.go_in[i] = w;
	 this.k_in[0][i - 1] = w;
	 arguments[i - 1].k[0] = w;
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
}

exports.Signal = Signal;
exports.Emit = Emit;
exports.Pause = Pause;
exports.Present = Present;
exports.Sequence = Sequence;
exports.ReactiveMachine = ReactiveMachine;
