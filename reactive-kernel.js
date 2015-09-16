"use strict"

function must_be_implemented(context) {
   throw "Runtime error: must be implemented! " + context.constructor.name;
}

function Signal(name, value) {
   /* value == false: pure signal
      value != false: valued signal */

   this.name = name;
   this.set = false;
   this.value = value == undefined ? false : value;
}

/* A wire connect two statements.
   Example: the GO wire of suspend to GO wire of pause.
   The `state` attribute, contains the status (set or unset) of the wire */

function Wire(input, output, state) {
   this.input = input;
   this.output = output;
   this.state = state == undefined ? false : state;
}

/* Root class of any kernel statement. Attributes prefixed by `w_` are
   wire that connect it to other statements. */

function Statement() {
   this.w_go = null;
   this.w_res = null;
   this.w_susp = null;
   this.w_kill = null;
   this.w_sel = null;

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.w_k = [null, null];
}

/* Get the mask telling which wire are on on a begining of a tick.
   Note that only "inputs" wires are needed here. */

Statement.prototype.get_config = function() {
   var mask = 0;

   mask |= this.w_go != null ? w_go.state : 0;
   mask |= this.w_res != null ? w_res.state : 0;
   mask |= this.w_susp != null ? w_susp.state : 0;
   mask |= this.w_kill != null ? w_kill.state : 0;

   return mask;
}

Statement.prototype.["%run"] = function(reactive_machine) {
   must_be_implemented(this);
}

Statement.prototype.connect

function EmitStatement(signal) {
   Statement.call(this);
   this.signal = null;
}

EmitStatement.prototype = new Statement();

EmitStatement.prototype.["%run"] = function(reactive_machine) {
   if (!this.w_go.state)
      return;

   this.signal.set = true;
   this.w[0].out.["%run"](reactive_machine);
}

function PauseStatement() {
   Statement.call(this);
   this.reg = false;
}

PauseStatement.prototype = new Statement()

PauseStatement.prototype.["%run"] = function() {
   if (this.w_res && this.reg) {
      this.reg = false;
      reactive_machine.resume_stmt = null;
      this.w_k[0].out.["%run"](reactive_machine);
   } else if (this.w_go_state) {
      this.reg = true;
      reactive_machine.resume_stmt = this;
      this.w_k[1].out.["%run"](reactive_machine);
   }
}

function ReactiveMachine() {
   Statement.call(this);
   this.seq = -1;
   this.resume_stmt = false;
   this.w_go = new Wire(this, null, true);
   this.w_res = new Wire(this, null, true);
   this.w_susp = new Wire(this, null);
   this.w_kill = new Wire(this, null);
   this.w_k[0] = new Wire(null, this);
   this.w_k[1] = new Wire(null, this);
}

ReactiveMachine.prototype = new Statement();

ReactiveMachine.prototype.react = function(seq) {
   if (this.seq <= seq)
      return;

   this.seq = seq;

   if (this.resume_stmt != null)
      this.resume_stmt.["%run"](this);
   else
      this.w_go.out.["%run"](this);

   if ((this.w_k[1].state && resume_stmt == null)
       || (this.w_k[0].state && resume_stmt != null))
      throw "Unconsistent state";
}

exports.Signal = Signal;
exports.EmitStatement = EmitStatement;
exports.PauseStatement = PauseStatement;
exports.ReactiveMachine = ReactiveMachine;
