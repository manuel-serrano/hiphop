"use hopscript"

var hh = require("hiphop");

function foo(evt) {
   console.log("foo called by", evt.signal, "with value", evt.value);
}

var prg = <hh.module>
  <hh.inputsignal name="I" type="number"/>
  <hh.outputsignal name="O" type="number"/>
  <hh.sequence>
    <hh.await signal_name="I" />
    <hh.emit signal_name="O" exprs=${hh.value("I")}/>
  </hh.sequence>
</hh.module>;

var m = new hh.ReactiveMachine(prg, "awaitvalued");
m.addEventListener("O", foo);

exports.prg = m;
