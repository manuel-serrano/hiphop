"use strict"

var reactive = require("./reactive-kernel.js");

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

var sigS = new reactive.Signal("S", false, function() {
   console.log("EMIT S");
});

var sigT = new reactive.Signal("T", false, function() {
   console.log("EMIT T");
});

var sigV = new reactive.Signal("V", false, function() {
   console.log("EMIT V");
});

var emitS = new reactive.Emit(sigS);
var emitT = new reactive.Emit(sigT);
var emitV = new reactive.Emit(sigV);
var present = new reactive.Present(sigS, emitT);
var pause = new reactive.Pause();
var seq = new reactive.Sequence(emitS, present, pause, emitV);
var loop = new reactive.Loop(seq);
var machine = new reactive.ReactiveMachine(loop);

for (var i = 0; i < 5; i++)
   machine.react(i);
