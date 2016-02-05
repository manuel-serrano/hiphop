"use hopscript"

var hh = require("hiphop");

var m =
    <hh.module>
      <hh.inputsignal name="S"/>
      <hh.outputsignal name="O"/>
      <hh.outputsignal name="F"/>
      <hh.outputsignal name="W"/>
      <hh.weakabort immediate signal_name="S">
	<hh.loop>
	  <hh.emit signal_name="O"/>
	  <hh.pause/>
	  <hh.emit signal_name="W"/>
	</hh.loop>
      </hh.weakabort>
      <hh.emit signal_name="F"/>
    </hh.module>

exports.prg = new hh.ReactiveMachine(m, "wabortimmediate")
