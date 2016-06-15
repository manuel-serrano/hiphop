"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="R"/>
      <hh.inputsignal name="A"/>
      <hh.inputsignal name="B"/>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.abort signal="R">
	  <hh.parallel>
	    <hh.await signal="A" />
	    <hh.await signal="B" />
	  </hh.parallel>
	  <hh.emit signal="O" />
	  <hh.halt/>
	</hh.abort>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "ABRO");


