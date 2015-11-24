"use hopscript"

var rjs = require("reactive-js");

function minus(arg1, arg2) { return arg1 - arg2 };
function plus(arg1, arg2) { return arg1 + arg2 };

var prg = <rjs.ReactiveMachine debug name="value2">
  <rjs.outputsignal name="I" type="number"/>
  <rjs.outputsignal name="O" type="number" init_value=5 combine_with="*"/>
  <rjs.outputsignal name="U" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="I" func=${plus} exprs=${[(3 - 2), 5]}/>
      <rjs.emit signal_name="O" func=${plus} exprs=${[rjs.Value("I"), 7]}/>
      <rjs.emit signal_name="U" func=${minus} exprs=${[rjs.PreValue("O"), 1]}/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
