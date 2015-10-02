"use strict"

var reactive = require("../reactive-kernel.js");

/*
  <ReactiveMachine>
     <abort when=${a}>
        <loop>
           <emit signal=${s} />
           <present signal=${s}>
              <emit signal=${t} />
           </present>
           <pause />
	   <emit signal=${v} />
        </loop>
     </abort>
  </ReactiveMachine>
*/

var sigA = new reactive.Signal("A", false, null);

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
var abort = new reactive.Abort(loop, sigA);
var machine = new reactive.ReactiveMachine(abort);

for (var i = 0; i < 5; i++)
   machine.react(i);

sigA.set_from_host(true, null);
machine.react(5);
machine.react(6);
machine.react(7);
machine.react(8);
