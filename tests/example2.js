"use strict"

var reactive = require("../reactive-kernel.js");
var inspector = require("../inspector.js");
var rjs = require("../xml-compiler.js");

var sigT = new reactive.Signal("T", false);
var sigV = new reactive.Signal("V", false);

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
