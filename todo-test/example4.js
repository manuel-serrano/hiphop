"use strict"

var reactive = require("../reactive-kernel.js");

/*
  <ReactiveMachine>
     <abort when=${a}>
        <loop>
	   <await signal=${b} />
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

var sigB = new reactive.Signal("B", false, null);

var sigS = new reactive.Signal("S", false, function() {
   console.log("EMIT S");
});

var sigT = new reactive.Signal("T", false, function() {
   console.log("EMIT T");
});

var sigV = new reactive.Signal("V", false, function() {
   console.log("EMIT V");
});

var awaitB = new reactive.Await(sigB);
var emitS = new reactive.Emit(sigS);
var emitT = new reactive.Emit(sigT);
var emitV = new reactive.Emit(sigV);
var present = new reactive.Present(sigS, emitT);
var pause = new reactive.Pause("ext pause");
var seq = new reactive.Sequence(awaitB,
				emitS,
				present,
				pause,
				emitV);
var loop = new reactive.Loop(seq);
var abort = new reactive.Abort(loop, sigA);
var machine = new reactive.ReactiveMachine(abort);

// for (var i = 0; i < 5; i++)
//    machine.react(i);

machine.react(0);
machine.react(1);

sigB.set = true;
machine.react(5);
sigB.set = false;
machine.react(7);
machine.react(8);
machine.react(9);
sigB.set = true;
machine.react(10);
machine.react(11);
