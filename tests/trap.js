"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigA = new rjs.Signal("A");
var sigB = new rjs.Signal("B");
var sigC = new rjs.Signal("C");

var prg = <rjs.reactivemachine name="trapsimple">
  <rjs.outputsignal ref=${sigA}/>
  <rjs.outputsignal ref=${sigB}/>
  <rjs.outputsignal ref=${sigC}/>
  <rjs.sequence>
    <rjs.emit signal_name="A"/>
    <rjs.trap trap_name="T">
      <rjs.sequence>
	<rjs.exit trap_name="T"/>
	<rjs.emit signal_name="B"/>
      </rjs.sequence>
    </rjs.trap>
    <rjs.emit signal_name="C"/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
