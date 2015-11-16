"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigI = new rjs.Signal("I");
var sigJ = new rjs.Signal("J");
var sigK = new rjs.Signal("K");
var sigV = new rjs.Signal("V");

var prg = <rjs.reactivemachine debug name="abortpresent">
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
