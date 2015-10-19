"use hopscript"

var rjs = require("../xml-compiler.js");
var reactive = require("../reactive-kernel.js");
require("../js2esterel.js");

var sigT = new reactive.Signal("T", false);
var sigW = new reactive.Signal("W", false);
var sigV = new reactive.Signal("V", false);
var sigZ = new reactive.Signal("Z", false);
var sigU = new reactive.Signal("U", false);
sigU.local = true;
var sigS = new reactive.Signal("S", false);
sigS.local = true;
var sigA = new reactive.Signal("A", false);

var m1 = <rjs.reactivemachine name="m1">
  <rjs.parallel>
    <rjs.present signal=${sigT}>
      <rjs.sequence>
	<rjs.emit signal=${sigV}/>
	<rjs.nothing/>
      </rjs.sequence>
    </rjs.present>
    <rjs.present signal=${sigW}>
      <rjs.sequence>
	<rjs.emit signal=${sigZ}/>
	<rjs.nothing/>
      </rjs.sequence>
    </rjs.present>
  </rjs.parallel>
</rjs.reactivemachine>;

var m2 = <rjs.reactivemachine name="run2">
<rjs.sequence>
  <rjs.emit signal=${sigS}/>
  <rjs.emit signal=${sigU}/>
  <rjs.run machine=${m1}>
    <rjs.mergesignal caller=${sigS} callee=${sigT}/>
    <rjs.mergesignal caller=${sigU} callee=${sigW}/>
    <rjs.mergesignal caller=${sigA} callee=${sigZ}/>
  </rjs.run>
</rjs.sequence>
</rjs.reactivemachine>;

exports.prg = m2;
console.log(m2.esterel_code());
