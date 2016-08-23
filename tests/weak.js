"use hopscript"

var hh = require("hiphop");

var m =
    <hh.module>
      <hh.inputsignal name="S"/>
      <hh.outputsignal name="O"/>
      <hh.outputsignal name="F"/>
      <hh.outputsignal name="W"/>
      <hh.weakabort signal="S">
	<hh.loop>
	  <hh.emit signal="O"/>
	  <hh.pause/>
	  <hh.emit signal="W"/>
	</hh.loop>
      </hh.weakabort>
      <hh.emit signal="F"/>
    </hh.module>

exports.prg = new hh.ReactiveMachine(m, "wabort");
