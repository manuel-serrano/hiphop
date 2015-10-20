"use hopscript"

var rjs = require("../xml-compiler.js");
var rkernel = require("../reactive-kernel.js");
var inspector = require("../inspector.js");

var sigI = new rkernel.Signal("I", false);
var sigJ = new rkernel.Signal("J", false);
var sigK = new rkernel.Signal("K", false);
var sigV = new rkernel.Signal("V", false);

var prg = <rjs.reactivemachine name="abortpresent">
  <rjs.inputsignal ref=${sigI}/>
  <rjs.outputsignal ref=${sigJ}/>
  <rjs.outputsignal ref=${sigK}/>
  <rjs.outputsignal ref=${sigV}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.abort signal_name="I">
	<rjs.sequence>
	  <rjs.emit signal_name="J"/>
	  <rjs.pause/>
	  <rjs.emit signal_name="V"/>
	  <rjs.pause/>
	</rjs.sequence>
      </rjs.abort>
      <rjs.present signal_name="I">
	<rjs.emit signal_name="K"/>
      </rjs.present>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>

exports.prg = prg;
