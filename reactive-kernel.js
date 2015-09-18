"use strict"

const THEN = 0;
const ELSE = 1;

function must_be_implemented(context) {
   throw "Runtime error: must be implemented! " + context.constructor.name;
}

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

Statement.prototype.run = function() {
   must_be_implemented(this);
}

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

Circuit.prorotype = new Statement();

function ReactiveMachine(circuit) {
   Circuit.call(this);
   this.seq = -1;

   this.go_in = circuit.go = new Wire(this, circuit);
   this.res_in = circuit.res = new Wire(this, circuit);
   this.susp_in = circuit.susp = new Wire(this, circuit);
   this.kill_in = circuit.kill = new Wire(this, circuit);
   this.sel_in = circuit.sel = new Wire(this, circuit);

   for (var i in circuit.k)
      this.k_in[i] = circuit.k[i] = new Wire(this, circuit);
}

ReactiveMachine.prototype = new Circuit();

ReactiveMachine.prototype.react(seq) {
   if (seq <= this.seq)
      return;

   this.go_in.set = true;
   this.res_in.set = true;
   this.susp_in.set = false;
   this.kill_in.set = false;

   console.log("---- reaction " + seq + " started ----");
   this.go_in.stmt_out.run();
}

ReactiveMachine.prototype.run = function() {
   this.sel = this.sel_in;
   for (var i in this.k_in)
      this.k[i] = this.k_in;
   console.log("---- return codes sel:" + this.sel + " k:" + this.k + " ----");
   console.log("---- reaction " + seq + " ended ----");
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

   if (this.go.set) {
      if (!this.kill.set )
	 this.reg = true;
      this.k[1].set = true;
   }

   if (this.susp.set && this.sel.set && !this.kill.set)
      this.reg = true;

   if (this.res.set && this.reg) {
      this.reg = false;
      this.k[0].set = true;
   }
}

/* Present test - Figure 11.5 page 117
   X_in[THEN] represent X_in of then branch
   X_in[ELSE] represent X_in of else branch
   It's allowed to have only a then branch */

function Present(signal, then_branch, else_branch) {
   Circuit.call(this);
   this.signal = signal;
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

   for (var i in circuit.k) {
      if (this.k_in[i] == undefined) {
	 this.k_in[i] = [];
	 this.k[i] = [];
      }
      this.k_in[i][branch] = circuit.k[i] = new Wire(this, circuit);
   }
}

Present.prototype.run() {
   var branch;

   if (this.signal.set)
      branch = THEN;
   else
      branch = ELSE;

   this.go_in[branch].go.set = this.go.set;
   this.res_in[branch].res.set = this.res.set;
   this.susp_in[branch].susp.set = this.susp.set;
   this.kill_in[branch].kill.set = this.kill.set;

   this.go_in[branch].stmt_out.run();

   this.sel.set = this.sel_in[branch].set;
   for (var i in this.k_in)
      this.k[i] = (this.k_in[i][branch] == undefined ?
		   false : this.k_in[i][branch];)
}

/* Sequence - Figure 11.8 page 120
   X_in[i] represents the connexion of the i subcircuit inside this sequence */

function Sequence() {
   Circuit.call(this);
   var seq_len = arguments.length;
}

Sequence.prototype = new Circuit();

exports.Signal = Signal;
exports.Emit = Emit;
exports.Pause = Pause;
exports.Present = Present;
exports.Sequence = Sequence;
exports.ReactiveMachine = ReactiveMachine;
