"use strict"

var rk = require("./reactive-kernel.js");

/*
  <ReactiveMachine>
     <Pause />
     <Emit signal=${signal} />
  </ReactiveMachine>
*/

var reactive_machine = new rk.ReactiveMachine();
var pause_stmt = new rk.PauseStatement(reactive_machine);
var signal = new rk.Signal("S", false, function() {
   console.log("EMIT " + this.name)
});
var emit_stmt = new rk.EmitStatement(signal);

reactive_machine.connect_direct(pause_stmt, rk.GO);
reactive_machine.connect_direct(pause_stmt, rk.RES);
pause_stmt.connect_return_direct(reactive_machine, 1);
pause_stmt.connect_return_input(0, emit_stmt, rk.GO);
emit_stmt.connect_return_direct(reactive_machine, 0);



console.log("reactive machine ready...");

reactive_machine.react(0);

reactive_machine.react(1);
