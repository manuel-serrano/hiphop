"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="R"/>
      <hh.inputsignal name="A"/>
      <hh.inputsignal name="B"/>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.abort signal_name="R">
	  <hh.parallel>
	    <hh.await signal_name="A" />
	    <hh.await signal_name="B" />
	  </hh.parallel>
	  <hh.emit signal_name="O" />
	  <hh.halt/>
	</hh.abort>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "ABRO");


