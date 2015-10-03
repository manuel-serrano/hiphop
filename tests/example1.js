"use strict"

var reactive = require("../reactive-kernel.js");
var inspector = require("../inspector.js");

/*
  <ReactiveMachine>
     <pause />
     <emit signal=${s} />
     <present signal=${s}>
        <emit signal=${t} />
     </present>
  </ReactiveMachine>
*/

var sigS = new reactive.Signal("S", false, function() {
   console.log("EMIT S");
});

var sigT = new reactive.Signal("T", false, function() {
   console.log("EMIT T");
});

var emitS = new reactive.Emit(sigS);
var emitT = new reactive.Emit(sigT);
var present = new reactive.Present(sigS, emitT);
var pause = new reactive.Pause();
var seq = new reactive.Sequence(pause, emitS, present);
var machine = new reactive.ReactiveMachine(seq);

//(new inspector.Inspector(machine)).inspect();
for (var i = 0; i < 5; i++)
   machine.react(i);

