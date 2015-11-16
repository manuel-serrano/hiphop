"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigA = new rjs.Signal("A");
var sigB = new rjs.Signal("B");
var sigR = new rjs.Signal("R");
var sigO = new rjs.Signal("O");

var prg = <rjs.reactivemachine name="ABRO">
  <rjs.inputsignal ref=${sigR}/>
  <rjs.inputsignal ref=${sigA}/>
  <rjs.inputsignal ref=${sigB}/>
  <rjs.outputsignal ref=${sigO}/>
  <rjs.loop>
    <rjs.abort signal_name="R">
      <rjs.sequence>
        <rjs.parallel>
          <rjs.await signal_name="A" />
          <rjs.await signal_name="B" />
        </rjs.parallel>
        <rjs.emit signal_name="O" />
	<rjs.halt/>
      </rjs.sequence>
    </rjs.abort>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
