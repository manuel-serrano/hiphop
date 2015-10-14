var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");

var sigI = new reactive.Signal("I", false);
var sigS = new reactive.Signal("S", false);

var machine = <rjs.ReactiveMachine name="looppauseemit">
  <rjs.loop>
    <rjs.Sequence>
      <rjs.await signal=${sigI}/>
      <rjs.pause/>
      <rjs.emit signal=${sigS}/>
    </rjs.Sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = machine;
