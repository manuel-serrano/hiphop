"use hopscript"

var rjs = require("../xml-compiler.js");
var rkernel = require("../reactive-kernel.js");
var inspector = require("../inspector.js");

var sigA = new rkernel.Signal("A", false);
var sigB = new rkernel.Signal("B", false);
var sigO = new rkernel.Signal("O", false);

var prg = <rjs.reactivemachine name="await-par">
  <rjs.sequence>
    <rjs.parallel>
      <rjs.await signal=${sigA} />
      <rjs.await signal=${sigB} />
    </rjs.parallel>
    <rjs.emit signal=${sigO} />
  </rjs.sequence>
</rjs.reactivemachine>;

prg.react();
prg.react();

sigB.set_from_host(true, null);
prg.react();

sigA.set_from_host(true, null);
prg.react();
prg.react();
prg.react();

sigB.set_from_host(true, null);
prg.react();

sigA.set_from_host(true, null);
prg.react();

prg.reset();
//(new inspector.Inspector(prg)).inspect();
sigA.set_from_host(true, null);
prg.react();

sigB.set_from_host(true, null);
prg.react();
prg.react();
