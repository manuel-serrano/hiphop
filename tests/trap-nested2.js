"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigA = new rjs.Signal("A");
var sigB = new rjs.Signal("B");
var sigC = new rjs.Signal("C");
var sigD = new rjs.Signal("D");

var prg = <rjs.reactivemachine debug name="trapnested2">
  <rjs.outputsignal ref=${sigA}/>
  <rjs.outputsignal ref=${sigB}/>
  <rjs.outputsignal ref=${sigC}/>
  <rjs.outputsignal ref=${sigD}/>
  <rjs.sequence>
    <rjs.emit signal_name="A"/>
    <rjs.trap trap_name="U">
      <rjs.sequence>
	<rjs.trap trap_name="T">
	  <rjs.sequence>
	    <rjs.exit trap_name="U"/>
	    <rjs.emit signal_name="B"/>
	  </rjs.sequence>
	</rjs.trap>
	<rjs.emit signal_name="C"/>
      </rjs.sequence>
    </rjs.trap>
    <rjs.emit signal_name="D"/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
