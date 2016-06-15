"use hopscript"

var hh = require("hiphop");

var example = <hh.module>
  <hh.outputsignal name=I />
  <hh.outputsignal name=O />
  <hh.loop>
    <hh.sequence>
      <hh.present signal="O">
	<hh.emit signal="I"/>
      </hh.present>
      <hh.emit signal="O"/>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(example, "presentemit");
