"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigT = new rjs.Signal("T");
var sigV = new rjs.Signal("V");

var prg = <rjs.reactivemachine name="example2">
  <rjs.outputsignal ref=${sigT}/>
  <rjs.outputsignal ref=${sigV}/>
  <rjs.localsignal signal_name="S">
    <rjs.loop>
      <rjs.sequence>
	<rjs.emit signal_name="S"/>
	<rjs.present signal_name="S">
	  <rjs.emit signal_name="T"/>
	</rjs.present>
	<rjs.pause/>
	<rjs.emit signal_name="V"/>
      </rjs.sequence>
    </rjs.loop>
  </rjs.localsignal>
</rjs.ReactiveMachine>

exports.prg = prg;
