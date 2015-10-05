"use hopscript"

var rjs = require("../xml-compiler.js");
var rkernel = require("../reactive-kernel.js");
var inspector = require("../inspector.js");

var sigA = new rkernel.Signal("A", false, null);
var sigB = new rkernel.Signal("B", false, null);
var sigO = new rkernel.Signal("O", false, function() {
   console.log("EMIT O");
});

var prg = <rjs.reactivemachine>
  <rjs.sequence>
    <rjs.parallel>
      <rjs.await signal=${sigA} />
      <rjs.await signal=${sigB} />
    </rjs.parallel>
    <rjs.emit signal=${sigO} />
  </rjs.sequence>
</rjs.reactivemachine>;

//(new inspector.Inspector(prg)).inspect();
prg.react();
prg.react();

console.log("B;");
sigB.set_from_host(true, null);
prg.react();

console.log("A;");
sigA.set_from_host(true, null);
prg.react();
prg.react();
prg.react();

console.log("B;");
sigB.set_from_host(true, null);
prg.react();
