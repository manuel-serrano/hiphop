"use strict"

var GO = 0;
var RES = 1;
var SUSP = 2;
var KILL = 3;
var SEL = 4;
var K = 5;

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

function Wire(stmt1, stmt2) {
   this.stmt1 = stmt1;
   this.stmt2 = stmt2;
   this.set = false;
}

/* Root class of any kernel statement. */

function Statement() {
   this.machine = null;

   this.wires = [];
   this.wires[GO] = null;
   this.wires[RES] = null;
   this.wires[SUSP] = null;
   this.wires[KILL] = null;
   this.wires[SEL] = null;

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.wires[K] = [null, null];
}

/* Get the mask telling which wire are on on a begining of a tick.
   Note that only "inputs" wires are needed here. */

Statement.prototype.get_config = function() {
   var mask = 0;

   mask |= this.wires[GO] != null ? this.wires[GO].set : 0;
   mask |= this.wires[RES] != null ? this.wires[RES].set : 0;
   mask |= this.wires[SUSP] != null ? this.wires[SUSP].set : 0;
   mask |= this.wires[KILL] != null ? this.wires[KILL].set : 0;
   return mask;
}

Statement.prototype.run = function() {
   must_be_implemented(this);
}

function EmitStatement(signal) {
   Statement.call(this);
   this.signal = signal;
}

EmitStatement.prototype = new Statement();

EmitStatement.prototype.run = function() {
   if (!this.wires[GO].set)
      return;

   this.signal.set = true;
   if (this.signal.emit_cb)
      this.signal.emit_cb();
   this.wires[K][0].stmt2.run();

   /* TODO: Maybe it's wrong to reset the signal here (because of parallels).
      That case, make a list to signal to reset on reactive machine */
   this.signal.set = false;
}

function PauseStatement() {
   Statement.call(this);
   this.reg = false;
}

PauseStatement.prototype = new Statement()

PauseStatement.prototype.run = function() {
   if (this.wires[RES] && this.reg) {
      this.reg = false;
      this.machine.resume_stmt = null;
      this.wires[K][0].stmt2.run();
   } else if (this.wires[GO].set) {
      this.reg = true;
      this.machine.resume_stmt = this;
      this.wires[K][1].stmt2.run();
   }
}

function ReactiveMachine() {
   Statement.call(this);
   this.seq = -1;
   this.resume_stmt = null;
   delete this.machine;
}

ReactiveMachine.prototype = new Statement();

ReactiveMachine.prototype.add_stmt = function(stmt) {
   if (stmt == this)
      return;
   stmt.machine = this;
}

ReactiveMachine.prototype.connect = function(stmt1, w1, stmt2, w2) {
   var wire = new Wire(stmt1, stmt2);

   stmt1.wires[w1] = wire;
   stmt2.wires[w2] = wire;

   /* GO and RES wires of global environment are always set */

   if (stmt1 == this && (w1 == GO || w1 == RES))
      stmt1.wires[w1].set = true;

   this.add_stmt(stmt1);
   this.add_stmt(stmt2);
}

ReactiveMachine.prototype.connect_return = function(stmt1, code, stmt2, w) {
   if (code < 0)
      throw "Invalid return code";

   var wire = new Wire(stmt1, stmt2);

   stmt1.wires[K][code] = wire;
   stmt2.wires[w] = wire;

   this.add_stmt(stmt1);
   this.add_stmt(stmt2);
}

ReactiveMachine.prototype.connect_return_direct = function(stmt1, code1,
							   stmt2, code2) {
   if (code1 < 0 || code2 < 0)
      throw "Invalid return codes";

   var wire = new Wire(stmt1, stmt2);

   stmt1.wires[K][code1] = wire;
   stmt2.wires[K][code2] = wire;

   this.add_stmt(stmt1);
   this.add_stmt(stmt2);
}

ReactiveMachine.prototype.react = function(seq) {
   if (seq <= this.seq)
      return;
   console.log("---- reaction " + seq + " begin ----");

   this.seq = seq;

   if (this.resume_stmt != null)
      this.resume_stmt.run();
   else
      this.wires[GO].stmt2.run();

   if ((this.wires[K][1].set && resume_stmt == null)
       || (this.wires[K][0].set && resume_stmt != null))
      throw "Unconsistent state";
}

ReactiveMachine.prototype.run = function() {
   console.log("---- reaction " + this.seq + " ended ----");
}

exports.Signal = Signal;
exports.EmitStatement = EmitStatement;
exports.PauseStatement = PauseStatement;
exports.ReactiveMachine = ReactiveMachine;

exports.GO = GO;
exports.RES = RES;
exports.SUSP = SUSP;
exports.KILL = KILL;
exports.SEL = SEL;
exports.K = K;
