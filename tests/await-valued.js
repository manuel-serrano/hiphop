"use hopscript"

var rjs = require("hiphop");

function foo(evt) {
   console.log("foo called by", evt.signal, "with value", evt.value);
}

var prg = <rjs.reactivemachine debug name="awaitvalued">
  <rjs.inputsignal name="I" type="number"/>
  <rjs.outputsignal name="O" type="number" react_functions=${foo}/>
  <rjs.sequence>
    <rjs.await signal_name="I" />
    <rjs.emit signal_name="O" exprs=${rjs.value("I")}/>
  </rjs.sequence>
</rjs.reactive.machine>;

exports.prg = prg;
