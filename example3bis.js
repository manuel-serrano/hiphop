"use strict"

var reactive = require("./reactive-kernel.js");

/*
  <ReactiveMachine>
     <loop>
        <abort when=${a}>
           <emit signal=${s} />
           <present signal=${s}>
              <emit signal=${t} />
           </present>
           <pause />
	   <emit signal=${v} />
	</abort>
     </loop>
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
emitS.loc = "emitS";
var emitT = new reactive.Emit(sigT);
emitT.loc = "emitT";
var emitV = new reactive.Emit(sigV);
emitV.loc = "emitV";
var present = new reactive.Present(sigS, emitT);
var pause = new reactive.Pause();
var seq = new reactive.Sequence(emitS, present, pause, emitV);
var abort = new reactive.Abort(seq, sigA);
var loop = new reactive.Loop(abort);
var machine = new reactive.ReactiveMachine(loop);

for (var i = 0; i < 5; i++)
   machine.react(i);

sigA.set = true;
machine.react(5);
machine.react(6);
machine.react(7);
machine.react(8);
