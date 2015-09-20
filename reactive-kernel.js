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

Statement.prototype.init_reg = function() { }

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
   if (seq <= this.seq)
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
   // this.k[0].set = false;
   // this.signal.set = false;
   // if (!this.go.set)
   //    return;

   // this.signal.set = true;
   // if (this.signal.emit_cb)
   //    this.signal.emit_cb();
   // this.k[0].set = true;
   this.k[0].set = this.go.set;
   this.signal.set = this.go.set;
   if (this.go.set)
      this.signal.emit_cb();
}

/* Pause - Figure 11.3 page 115 */

function Pause(debug) {
   Statement.call(this);
   this.reg = false;
   this.debug = debug == undefined ? false : true;
}

Pause.prototype = new Statement()

Pause.prototype.run = function() {
   // this.k[0].set = false;
   // this.k[1].set = this.go.set;
   // this.sel.set = this.reg;

   // if (this.res.set && this.reg) {
   //    this.reg = false;
   //    this.k[0].set = true;
   // } else if (this.go.set && !this.kill.set) {
   //    this.reg = true;
   //          this.sel.set = true;

   // } else if (this.susp.set && this.sel.set && !this.kill.set)
   //    this.reg = true;
   var reg = (this.susp.set && this.reg && !this.kill.set)
      || (this.go.set && !this.kill.set)
   this.sel.set = reg;
   this.k[1].set = this.go.set;
   this.k[0].set = this.reg && this.res.set;
   this.reg = reg;
}

Pause.prototype.init_reg = function() {
   this.reg = false;
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
}

Present.prototype.init_reg = function() {
   this.go_in[THEN].stmt_out.init_reg();
   if (this.go_in[ELSE] != undefined)
      this.go_in[ELSE].stmt_out.init_reg();
   this.k[0].stmt_out.init_reg();
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

Sequence.prototype.init_reg = function() {
   for (var i in this.go_in)
      this.go_in[i].stmt_out.init_reg();
}

function Loop(circuit, debug) {
   Circuit.call(this);
   this.debug = debug == undefined ? false : true;
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

// Loop.prototype.run = function() {
//    this.go_in.set = this.go.set;
//    this.res_in.set = this.res.set;
//    this.susp_in.set = this.susp.set;
//    this.kill_in.set = this.kill.set;

//    this.go_in.stmt_out.run();

//    this.k[0].set = false;
//    this.sel.set = this.sel_in.set;
//    for (var i = 1; i < this.k_in.length; i++)
//       this.k[i].set = this.k_in[i].set;

//    if (this.k_in[0].set) {
//       this.go_in.set = true;
//       this.go_in.stmt_out.run();
//       this.k[0].set = false;
//       for (var i = 1; i < this.k_in.length; i++)
// 	 this.k[i].set = this.k_in[i].set;
//    }
// }

Loop.prototype.run = function() {
   var stop = false;

   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   while (!stop) {
      if (this.debug)
	 console.log(this.go_in.set,
		     this.res_in.set,
		     this.susp_in.set,
		     this.kill_in.set);
      this.go_in.set = this.go.set || this.k_in[0].set;
      this.go_in.stmt_out.run();
      this.sel.set = this.sel_in.set;
      this.k[0].set = this.k_in[0].set;
      stop = !this.k_in[0].set;
   }
   for (var i = 0; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;
}

Loop.prototype.init_reg = function() {
   this.go_in.stmt_out.init_reg();
}

function Abort(circuit, signal) {
   Circuit.call(this);
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

// Abort.prototype.run = function() {
//    if (this.res.set && this.sel_in.set && this.signal.set) {
//       this.k[0].set = true;
//       this.res_in.set = false;
//       this.sel.set = this.sel_in.set;

//       for (var i = 1; i < this.k.length; i++)
// 	 this.k[i].set = this.k_in[i].set;
//    } else {
//       this.go_in.set = this.go.set;
//       this.res_in.set = this.res.set && !this.signal.set;
//       this.susp_in.set = this.susp.set;
//       this.kill_in.set = this.kill.set;

//       /* Init return wire is really needed ? */
//       this.sel_in.set = false;
//       this.sel.set = false;
//       for (var i in this.k) {
// 	 this.k[i].set = false;
// 	 this.k_in[i].set = false;
//       }

//       this.go_in.stmt_out.run();

//       this.sel.set = this.sel_in.set;
//       for (var i in this.k) {
// 	 this.k[i].set = this.k_in[i].set;
//       }
//    }
// }

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
}

Abort.prototype.init_reg = function() {
   this.go_in.stmt_out.init_reg();
}

function Await(signal) {
   Circuit.call(this);
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
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   this.go_in.stmt_out.run();

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set;
   this.k[1].set = this.k_in[1].set;
}

function Halt() {
   Circuit.call(this);
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
exports.ReactiveMachine = ReactiveMachine;
