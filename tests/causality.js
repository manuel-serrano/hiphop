"use hopscript"

var hh = require("hiphop");

var example = <hh.module>
  <hh.outputsignal name="I"/>
  <hh.outputsignal name="O"/>
  <hh.loop>
    <hh.sequence>
      <hh.present signal_name="O">
	<hh.emit signal_name="I"/>
      </hh.present>
      <hh.pause/>
      <hh.emit signal_name="O"/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(example, "presentemit");
