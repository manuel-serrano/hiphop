"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="I"/>
  <hh.outputsignal name="J"/>
  <hh.outputsignal name="O"/>
  <hh.sequence>
    <hh.suspend signal="I">
      <hh.loop>
	<hh.sequence>
	  <hh.emit signal="O"/>
	  <hh.pause/>
	</hh.sequence>
      </hh.loop>
    </hh.suspend>
    <hh.emit signal="J"/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "SUSPEND");
