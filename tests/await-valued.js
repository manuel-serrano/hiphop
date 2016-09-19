"use hopscript"

var hh = require("hiphop");

function foo(evt) {
   console.log("foo called by", evt.signalName, "with value", evt.signalValue);
}

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

var prg = <hh.module I=${inSig} O=${outSig}>
    <hh.await I />
    <hh.emit O apply=${function() {return this.value.I}}/>
</hh.module>;

var m = new hh.ReactiveMachine(prg, "awaitvalued");
m.addEventListener("O", foo);

exports.prg = m;
