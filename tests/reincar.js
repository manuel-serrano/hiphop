"use hopstrict"

var hh = require("hiphop");

var prg =
<hh.module>
  <hh.outputsignal name="O"/>
  <hh.loop>
    <hh.localsignal name="S">
      <hh.present signal="S">
	<hh.emit signal="O"/>
      </hh.present>
      <hh.pause/>
      <hh.emit signal="S"/>
    </hh.localsignal>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "reincar");
