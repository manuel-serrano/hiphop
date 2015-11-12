"use hopscript"

var rjs = require("../xml-compiler.js");
var reactive = require("../reactive-kernel.js");
require("../js2esterel.js");

var sigT = new reactive.Signal("T");
var sigW = new reactive.Signal("W");
var sigV = new reactive.Signal("V");
var sigZ = new reactive.Signal("Z");

var m1 = <rjs.reactivemachine name="m1">
  <rjs.inputsignal ref=${sigT}/>
  <rjs.inputsignal ref=${sigW}/>
  <rjs.outputsignal ref=${sigV}/>
  <rjs.outputsignal ref=${sigZ}/>
  <rjs.parallel>
    <rjs.present signal_name="T">
      <rjs.emit signal_name="V"/>
    </rjs.present>
    <rjs.present signal_name="W">
      <rjs.emit signal_name="Z"/>
    </rjs.present>
  </rjs.parallel>
</rjs.reactivemachine>;

var sigS = new reactive.Signal("S");
var sigU = new reactive.Signal("U");
var sigA = new reactive.Signal("A");
var sigB = new reactive.Signal("B");

var m2 = <rjs.reactivemachine name="run2">
  <rjs.inputsignal ref=${sigS}/>
  <rjs.inputsignal ref=${sigU}/>
  <rjs.outputsignal ref=${sigA}/>
  <rjs.outputsignal ref=${sigB}/>
  <rjs.run machine=${m1} sigs_assoc=${{"T":"S",
				       "W":"U",
				       "V":"A",
				       "Z":"B"}}/>
</rjs.reactivemachine>;

exports.prg = m2;
