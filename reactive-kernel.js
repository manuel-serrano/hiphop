"use strict"

var GO = "w_go";
var RES = "w_res";
var SUSP = "w_susp";
var KILL = "w_kill";
var SEL = "w_sel";
var K = "w_k";

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
   this.w_go = [];
   this.w_res = [];
   this.w_susp = [];
   this.w_kill = [];
   this.w_sel = [];

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.w_k = [[], []];
}

Statement.prototype.run = function() {
   must_be_implemented(this);
}

Statement.prototype.connect = function(out_wire, stmt, in_wire) {
   var wire = new Wire(this, stmt);

   /* As JS properties are hashed in the object, we can access to w_go, w_X
      with this[wire] since wire matches to the property name */
   this[out_wire].push(wire);
   stmt[in_wire].push(wire);
}

Statement.prototype.is_set_OR = function(wire) {
   for (var i in this[wire]) {
      if (this[wire][i].set)
	 return true;
   }
   return false;
}

Statement.prototype.is_set_return_OR = function(ret_code)  {
   for (var i in this.w_k[ret_code])
      if (this.w_k[ret_code][i].set)
	 return true;
   return false;
}

Statement.prototype.init_return_wire = function(return_code) {
   if (this.w_k[return_code] == undefined)
      this.w_k[return_code] = [];
}

Statement.prototype.connect_direct = function(stmt, wire) {
   this.connect(wire, stmt, wire);
}

Statement.prototype.connect_return_input = function(ret_code, stmt, in_wire) {
   if (ret_code < 0)
      throw "Invalid code";

   var wire = new Wire(this, stmt);

   this.init_return_wire(ret_code);
   this.w_k[ret_code].push(wire);
   stmt[in_wire].push(wire);
}

Statement.prototype.connect_return_return = function(ret_code1, stmt,
						     ret_code2) {
   if (ret_code1 < 0 || ret_code2 < 0)
      throw "Invalid code";

   var wire = new Wire(this, stmt);
   this.init_return_wire(ret_code1);
   this.w_k[ret_code1].push(wire);
   stmt.init_return_wire(ret_code2);
   stmt.w_k[ret_code2].push(wire);
}

Statement.prototype.connect_return_direct = function(stmt, ret_code) {
   this.connect_return_return(ret_code, stmt, ret_code);
}

function EmitStatement(signal) {
   Statement.call(this);
   this.signal = signal;
}

EmitStatement.prototype = new Statement();

EmitStatement.prototype.run = function() {
   if (!this.is_set_OR(GO))
      return;

   this.signal.set = true;
   if (this.signal.emit_cb)
      this.signal.emit_cb();
   this.w_k[0][0].set = true;
   this.w_k[0][0].stmt2.run();
   this.signal.set = false;
   this.w_k[0][0].set = false;
}

function PauseStatement(machine) {
   Statement.call(this);
   this.reg = false;
   this.machine = machine;
}

PauseStatement.prototype = new Statement()

PauseStatement.prototype.run = function() {
   if (this.is_set_OR(RES) && this.reg) {
      this.reg = false;
      this.machine.resume_stmt = null;
      this.w_k[0][0].set = true;
      this.w_k[0][0].stmt2.run();
      this.w_k[0][0].set = false;
   } else if (this.is_set_OR(GO)) {
      this.reg = true;
      this.machine.resume_stmt = this;
      this.w_k[1][0].set = true;
      this.w_k[1][0].stmt2.run();
      this.w_k[1][0].set = false;
   }
}

function PresentStatement(signal) {
   Statement.call(this);
   this.signal = signal;
   this.w_go_then = null;
   this.w_go_else = null;
}

PresentStatement.prototype = new Statement();

PresentStatement.prototype.connect_then = function(stmt, in_wire) {
   var wire = new Wire(this, stmt);
   this.w_go_then = wire;
   stmt[in_wire].push(wire);
}

PresentStatement.prototype.connect_else = function(stmt, in_wire) {
   var wire = new Wire(this, stmt);
   this.w_go_else = wire;
   stmt[in_wire].push(wire);
}

PresentStatement.prototype.connect_then_return = function(stmt, ret_code) {
   var wire = new Wire(this, stmt);
   this.w_go_then = wire;
   stmt.w_k[ret_code].push(wire);
}

PresentStatement.prototype.connect_else_return = function(stmt, ret_code) {
   var wire = new Wire(this, stmt);
   this.w_go_else = wire;
   stmt.w_k[ret_code].push(wire);
}

PresentStatement.prototype.run = function() {
   if (!this.is_set_OR(GO))
      return;

   var wire;

   if (this.signal.set)
      wire = this.w_go_then;
   else
      wire = this.w_go_else;

   wire.set = true;
   wire.stmt2.run();
   wire.set = false;
}

function make_loop(begin, end) {
   end.connect_return_input(0, begin, GO);
}

function ReactiveMachine() {
   Statement.call(this);
   this.seq = -1;
   this.resume_stmt = null;
}

ReactiveMachine.prototype = new Statement();

/* GO and RES wires of global environment are always set */

ReactiveMachine.prototype.connect = function(out_wire, stmt, in_wire) {
   Statement.prototype.connect.call(this, out_wire, stmt, in_wire);

   if (out_wire == GO || out_wire == RES)
      this[out_wire][0].set = true;
}

ReactiveMachine.prototype.react = function(seq) {
   if (seq <= this.seq)
      return;
   console.log("---- reaction " + seq + " begin ----");

   this.seq = seq;

   if (this.resume_stmt != null)
      this.resume_stmt.run();
   else
      this.w_go[0].stmt2.run();

   if ((this.is_set_return_OR(1) && resume_stmt == null)
       || (this.is_set_return_OR(0) && resume_stmt != null))
      throw "Unconsistent state";
}

ReactiveMachine.prototype.run = function() {
   console.log("---- reaction " + this.seq + " ended ----");
}

exports.Signal = Signal;
exports.EmitStatement = EmitStatement;
exports.PauseStatement = PauseStatement;
exports.PresentStatement = PresentStatement;
exports.ReactiveMachine = ReactiveMachine;
exports.make_loop = make_loop;

exports.GO = GO;
exports.RES = RES;
exports.SUSP = SUSP;
exports.KILL = KILL;
exports.SEL = SEL;
exports.K = K;
