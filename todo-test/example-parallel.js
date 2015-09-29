var reactive = require("../reactive-kernel.js");

var sigI = new reactive.Signal("I", false, function() {
   console.log("EMIT I");
});

var sigJ = new reactive.Signal("J", false, function() {
   console.log("EMIT J");
});

var emitI = new reactive.Emit(sigI);
var awaitI = new reactive.Await(sigI);
var emitJ = new reactive.Emit(sigJ);
var seq = new reactive.Sequence(awaitI, emitJ);
var par = new reactive.Parallel(emitI, seq);
var machine = new reactive.ReactiveMachine(par);

machine.react();
machine.react();
machine.react();
machine.react();
