"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigJ = new rjs.Signal("J");

var machine = <rjs.ReactiveMachine debug name="parallel2">
  <rjs.outputsignal ref=${sigJ}/>
  <rjs.localsignal signal_name="I">
    <rjs.Parallel>
      <rjs.present signal_name="I">
	<rjs.emit signal_name="J"/>
      </rjs.present>
      <rjs.emit signal_name="I"/>
    </rjs.Parallel>
  </rjs.localsignal>
</rjs.ReactiveMachine>;

exports.prg = machine;
