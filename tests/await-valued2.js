"use hopscript"

var rjs = require("hiphop");

function foo(evt) {
   console.log("foo called by", evt.signal, "with value", evt.value);
}

function foo2(evt) {
   console.log("foo2 called by", evt.signal, "with value", evt.value);
}

function foo3(evt) {
   console.log("foo3 called by", evt.signal, "with value", evt.value);
}


var prg = <rjs.reactivemachine debug name="awaitvalued2">
  <rjs.inputsignal name="I" type="number"/>
  <rjs.outputsignal name="O" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.await signal_name="I" />
      <rjs.emit signal_name="O" exprs=${rjs.value("I")} />
    </rjs.sequence>
  </rjs.loop>
</rjs.reactive.machine>;

prg.addEventListener("O", foo);

exports.prg = prg;
exports.foo = foo;
exports.foo2 = foo2;
exports.foo3 = foo3;
