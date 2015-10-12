var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");

var sigI = new reactive.Signal("I", false);
var sigS = new reactive.Signal("S", false);

var machine = <rjs.ReactiveMachine name="loop-pause-emit">
  <rjs.loop>
    <rjs.Sequence>
      <rjs.await signal=${sigI}/>
      <rjs.pause/>
      <rjs.emit signal=${sigS}/>
    </rjs.Sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

machine.react();

sigI.set_from_host(true, null);
machine.react();
sigI.set_from_host(true, null);// <--- ce truc doit marcher !!
machine.react();
sigI.set_from_host(true, null);
machine.react();
machine.react();
machine.react();
machine.react();

sigI.set_from_host(true, null);
machine.react();
machine.react();
machine.react();

