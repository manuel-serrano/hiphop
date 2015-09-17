"use strict"

var rk = require("./reactive-kernel.js");

/*
  <ReactiveMachine>
     <loop>
        <emit signal=${s} />
        <present signal=${s}>
           <emit signal=${t} />
        </present>
        <pause />
	<emit signal=${v} />
     </loop>
  </ReactiveMachine>
*/

var rm = new rk.ReactiveMachine();
var pause = new rk.PauseStatement(rm);
var s = new rk.Signal("S", false, function() {
   console.log("EMIT " + this.name)
});
var t = new rk.Signal("T", false, function() {
   console.log("EMIT " + this.name)
});
var v = new rk.Signal("V", false, function() {
   console.log("EMIT " + this.name);
});
var present = new rk.PresentStatement(s);
var emitS = new rk.EmitStatement(s);
var emitT = new rk.EmitStatement(t);
var emitV = new rk.EmitStatement(v);

rm.connect_direct(emitS, rk.GO);
emitS.connect_return_input(0, present, rk.GO);
present.connect_then(emitT, rk.GO);
emitT.connect_return_input(0, pause, rk.GO);
//emitT.connect_return_input(0, emitV, rk.GO);
present.connect_else(pause, rk.GO); /* TODO exit present? */
rm.connect_direct(pause, rk.RES);
pause.connect_return_direct(rm, 1);
pause.connect_return_input(0, emitV, rk.GO);
rk.make_loop(emitS, emitV);

console.log("reactive machine ready...");

rm.react(0);
rm.react(1);
rm.react(2);
rm.react(3);
rm.react(4);
