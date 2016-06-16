"use hopstrict"

var hh = require("hiphop");

var prg =
<hh.module>
  <hh.outputsignal name="O"/>
  <hh.loop>
    <hh.let>
      <hh.signal name="S"/>
      <hh.present signal="S">
	<hh.emit signal="O"/>
      </hh.present>
      <hh.pause/>
      <hh.emit signal="S"/>
    </hh.let>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "reincar");
