"use hopscript"

var rjs = require("../xml-compiler.js");
var rkernel = require("../reactive-kernel.js");
var inspector = require("../inspector.js");
var batch = require("../batch-interpreter.js");

var sigA = new rkernel.Signal("A");
var sigB = new rkernel.Signal("B");
var sigR = new rkernel.Signal("R");
var sigO = new rkernel.Signal("O");

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
