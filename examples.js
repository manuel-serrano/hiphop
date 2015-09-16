"use strict"

var rk = require("./reactive-kernel.js");

/*
  <ReactiveMachine>
     <Pause />
     <Emit signal=${s} />
  </ReactiveMachine>
*/

var reactive_machine = new rk.ReactiveMachine();
var pause_stmt = new rk.PauseStatement();
var signal = new rk.Signal("S");
var emit_stmt = new rk.EmitStatement(signal);

rm.w_go.out = pause_stmt;
rm.w_res.out = pause_stmt;
