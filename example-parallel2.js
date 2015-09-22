var reactive = require("./reactive-kernel.js");

var sigI = new reactive.Signal("I", false, function() {
   console.log("EMIT I");
});

var sigJ = new reactive.Signal("J", false, function() {
   console.log("EMIT J");
});

var emitI = new reactive.Emit(sigI);
var emitJ = new reactive.Emit(sigJ);
var present = new reactive.Present(sigI, emitJ);
var par = new reactive.Parallel(present, emitI);
var machine = new reactive.ReactiveMachine(par);

machine.react();
machine.react();
machine.react();
machine.react();
