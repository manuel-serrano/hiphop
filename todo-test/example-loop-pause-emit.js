var reactive = require("../reactive-kernel.js");

var sigI = new reactive.Signal("I", false, function() {});

var sigS = new reactive.Signal("S", false, function() {
   console.log("EMIT S");
});

var emitS = new reactive.Emit(sigS);
var awaitI = new reactive.Await(sigI);
var pause = new reactive.Pause();
var loop = new reactive.Loop(new reactive.Sequence(awaitI,
						   pause,
						   emitS));
var machine = new reactive.ReactiveMachine(loop);

machine.react();

console.log("sigI set");
sigI.set = true;
machine.react();
//sigI.set = true;
machine.react();
sigI.set = true;
machine.react();
machine.react();
machine.react();
machine.react();

console.log("sigI set");
sigI.set = true;
machine.react();
machine.react();
machine.react();

