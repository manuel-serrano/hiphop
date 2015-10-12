var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");
var inspector = require("../inspector.js");

var sigI = new reactive.Signal("I", false);
sigI.local = true;
var sigJ = new reactive.Signal("J", false);

var machine = <rjs.ReactiveMachine name="parallel2">
  <rjs.Parallel>
    <rjs.present signal=${sigI}>
      <rjs.emit signal=${sigJ}/>
    </rjs.present>
    <rjs.emit signal=${sigI}/>
  </rjs.Parallel>
</rjs.ReactiveMachine>;

machine.react();
//(new inspector.Inspector(machine)).inspect();
machine.react();
machine.react();
machine.reset();
machine.react();

exports.par = machine;
