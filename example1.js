"use strict"

var reactive = require("./reactive-kernel.js");

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
   console.out("EMIT S");
});

var sigT = new reactive.Signal("T", false, function() {
   console.out("EMIT T");
});

var emitS = new reactive.Emit(sigS);
var emitT = new reactive.Emit(sigT);
var present = new reactive.Present(sigS, emitT);
var pause = new Pause();
var seq = new Sequence(pause, emitS, present);
var machine = new ReactiveMachine(seq);

for (var i = 0; i < 5; i++)
   machime.react(i);
