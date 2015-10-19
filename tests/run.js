"use hopscript"

var rjs = require("../xml-compiler.js");
var reactive = require("../reactive-kernel.js");
require("../js2esterel.js");

var sigT = new reactive.Signal("T", false);
sigT.local = true;
var sigV = new reactive.Signal("V", false);
var sigS = new reactive.Signal("S", false);
sigS.local = true;

var m1 = <rjs.reactivemachine name="m1">
  <rjs.present signal=${sigT}>
    <rjs.sequence>
      <rjs.emit signal=${sigV}/>
      <rjs.nothing/>
    </rjs.sequence>
  </rjs.present>
</rjs.reactivemachine>;

var m2 = <rjs.reactivemachine name="m2">
<rjs.sequence>
  <rjs.emit signal=${sigS}/>
  <rjs.run machine=${m1}>
    <rjs.mergesignal caller=${sigS} callee=${sigT}/>
  </rjs.run>
</rjs.sequence>
</rjs.reactivemachine>;

exports.prg = m2;

m2.react();
m2.react();

console.log(m2.esterel_code());
