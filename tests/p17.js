"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="O"/>
  <hh.loop>
    <hh.localsignal name="S1">
      <hh.sequence>
	<hh.present signal="S1">
	  <hh.emit signal="O"/>
	</hh.present>
	<hh.pause/>
	<hh.emit signal="S1"/>
      </hh.sequence>
    </hh.localsignal>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "P17")
