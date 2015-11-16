"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigA = new rjs.Signal("A");
var sigB = new rjs.Signal("B");
var sigC = new rjs.Signal("C");

var prg = <rjs.reactivemachine debug name="trappar">
  <rjs.outputsignal ref=${sigA}/>
  <rjs.outputsignal ref=${sigB}/>
  <rjs.outputsignal ref=${sigC}/>
  <rjs.trap trap_name="T">
    <rjs.parallel>
      <rjs.sequence>
	<rjs.emit signal_name="A"/>
	<rjs.exit trap_name="T"/>
      </rjs.sequence>
      <rjs.sequence>
	<rjs.emit signal_name="B"/>
	<rjs.pause/>
	<rjs.emit signal_name="C"/>
      </rjs.sequence>
    </rjs.parallel>
  </rjs.trap>
</rjs.reactivemachine>;

exports.prg = prg
