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
var signal = new rk.Signal("S", false, function() {
   console.log(this.name + "emitted")
});
var emit_stmt = new rk.EmitStatement(signal);

reactive_machine.connect(reactive_machine, rk.GO, pause_stmt, rk.GO);
reactive_machine.connect(reactive_machine, rk.RES, pause_stmt, rk.RES);
reactive_machine.connect_return_direct(pause_stmt, 1, reactive_machine, 1);

reactive_machine.connect_return(pause_stmt, 0, emit_stmt, rk.GO);
reactive_machine.connect_return_direct(emit_stmt, 0, reactive_machine, 0);

console.log("reactive machine ready...");

reactive_machine.react(0);

reactive_machine.react(1);
