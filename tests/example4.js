"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="A"/>
  <hh.outputsignal name="T"/>
  <hh.outputsignal name="V"/>
  <hh.localsignal name="S">
    <hh.loop>
      <hh.abort signal_name="A">
	<hh.sequence>
	  <hh.emit signal_name="S"/>
	  <hh.present signal_name="S">
	    <hh.emit signal_name="T"/>
	  </hh.present>
	  <hh.pause/>
	  <hh.emit signal_name="V"/>
	</hh.sequence>
      </hh.abort>
    </hh.loop>
  </hh.localsignal>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "example4");
