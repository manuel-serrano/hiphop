"use strict"

var rjs = require("../lib/reactive-js.js");

var sigT = new rjs.Signal("T");

var prg = <rjs.reactivemachine name="example1">
  <rjs.outputsignal ref=${sigT}/>
  <rjs.sequence>
    <rjs.pause/>
    <rjs.localsignal signal_name="S">
      <rjs.sequence>
	<rjs.emit signal_name="S"/>
	<rjs.present signal_name="S">
	  <rjs.emit signal_name="T"/>
	</rjs.present>
      </rjs.sequence>
    </rjs.localsignal>
  </rjs.sequence>
</rjs.ReactiveMachine>

exports.prg = prg;
