"use strict"

var reactive = require("../reactive-kernel.js");
var inspector = require("../inspector.js");
var rjs = require("../xml-compiler.js");

var sigA = new reactive.Signal("A");
var sigT = new reactive.Signal("T");
var sigV = new reactive.Signal("V");

var prg = <rjs.reactivemachine name="example4">
  <rjs.inputsignal ref=${sigA}/>
  <rjs.outputsignal ref=${sigT}/>
  <rjs.outputsignal ref=${sigV}/>
  <rjs.localsignal signal_name="S">
    <rjs.loop>
      <rjs.abort signal_name="A">
	<rjs.sequence>
	  <rjs.emit signal_name="S"/>
	  <rjs.present signal_name="S">
	    <rjs.emit signal_name="T"/>
	  </rjs.present>
	  <rjs.pause/>
	  <rjs.emit signal_name="V"/>
	</rjs.sequence>
      </rjs.abort>
    </rjs.loop>
  </rjs.localsignal>
</rjs.ReactiveMachine>

exports.prg = prg;
