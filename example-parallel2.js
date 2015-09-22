var reactive = require("./reactive-kernel.js");

var sigI = new reactive.Signal("I", false, function() {
   console.log("EMIT I");
});

var sigJ = new reactive.Signal("J", false, function() {
   console.log("EMIT J");
});

var emitI = new reactive.Emit(sigI);
var emitJ = new reactive.Emit(sigJ);
var awaitI = new reactive.Await(sigI);
var present = new reactive.Present(sigI, emitJ);
var seq = new reactive.Sequence(awaitI, present);
var par = new reactive.Parallel(seq, emitI);
var machine = new reactive.ReactiveMachine(par);

machine.react();
machine.react();
machine.react();
machine.react();
