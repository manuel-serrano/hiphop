var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");

var sigI = new reactive.Signal("I", false);
var sigS = new reactive.Signal("S", false);

var machine = <rjs.ReactiveMachine name="looppauseemit">
  <rjs.inputsignal ref=${sigI}/>
  <rjs.outputsignal ref=${sigS}/>
  <rjs.loop>
    <rjs.Sequence>
      <rjs.await signal_name="I"/>
      <rjs.pause/>
      <rjs.emit signal_name="S"/>
    </rjs.Sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = machine;
