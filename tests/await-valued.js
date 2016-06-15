"use hopscript"

var hh = require("hiphop");

function foo(evt) {
   console.log("foo called by", evt.signalName, "with value", evt.signalValue);
}

var prg = <hh.module>
  <hh.inputsignal name="I" valued />
  <hh.outputsignal name="O" valued />
    <hh.await signal="I" />
    <hh.emit signal="O" arg=${hh.value("I")}/>
</hh.module>;

var m = new hh.ReactiveMachine(prg, "awaitvalued");
m.addEventListener("O", foo);

exports.prg = m;
