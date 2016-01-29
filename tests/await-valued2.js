"use hopscript"

var hh = require("hiphop");

function foo(evt) {
   console.log("foo called by", evt.signal, "with value", evt.value);
}

function foo2(evt) {
   console.log("foo2 called by", evt.signal, "with value", evt.value);
}

function foo3(evt) {
   console.log("foo3 called by", evt.signal, "with value", evt.value);
}


var prg = <hh.module>
  <hh.inputsignal name="I" type="number"/>
  <hh.outputsignal name="O" type="number"/>
  <hh.loop>
    <hh.sequence>
      <hh.await signal_name="I" />
      <hh.emit signal_name="O" exprs=${hh.value("I")} />
    </hh.sequence>
  </hh.loop>
</hh.module>;

var m = new hh.ReactiveMachine(prg, "awaitvalued2");

m.addEventListener("O", foo);

exports.prg = m;
exports.foo = foo;
exports.foo2 = foo2;
exports.foo3 = foo3;
