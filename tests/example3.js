"use strict"

var reactive = require("../reactive-kernel.js");
var inspector = require("../inspector.js");
var rjs = require("../xml-compiler.js");

var sigA = new reactive.Signal("A");
var sigT = new reactive.Signal("T");
var sigV = new reactive.Signal("V");

var prg = <rjs.reactivemachine name="example3">
  <rjs.inputsignal ref=${sigA}/>
  <rjs.outputsignal ref=${sigT}/>
  <rjs.outputsignal ref=${sigV}/>
  <rjs.abort signal_name="A">
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
  </rjs.abort>
</rjs.ReactiveMachine>

exports.prg = prg;
