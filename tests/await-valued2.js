"use hopscript"

var rjs = require("reactive-js");

function foo(signame, sigval) {
   console.log("foo called by", signame, "with value", sigval);
}

function foo2(signame, sigval) {
   console.log("foo2 called by", signame, "with value", sigval);
}

function foo3(signame, sigval) {
   console.log("foo3 called by", signame, "with value", sigval);
}


var prg = <rjs.reactivemachine debug name="awaitvalued2">
  <rjs.inputsignal name="I" type="number"/>
  <rjs.outputsignal name="O" type="number" react_functions=${foo}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.await signal_name="I" />
      <rjs.emit signal_name="O" exprs=${rjs.value("I")} />
    </rjs.sequence>
  </rjs.loop>
</rjs.reactive.machine>;

exports.prg = prg;
exports.foo = foo;
exports.foo2 = foo2;
exports.foo3 = foo3;
