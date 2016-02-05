"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="I"/>
  <hh.outputsignal name="J"/>
  <hh.outputsignal name="O"/>
  <hh.sequence>
    <hh.suspend signal_name="I">
      <hh.loop>
	<hh.sequence>
	  <hh.emit signal_name="O"/>
	  <hh.pause/>
	</hh.sequence>
      </hh.loop>
    </hh.suspend>
    <hh.emit signal_name="J"/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "SUSPEND");
