"use hopstrict"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="O"/>
  <hh.loop>
    <hh.localsignal name="S">
      <hh.present signal_name="S">
	<hh.emit signal_name="O"/>
      </hh.present>
      <hh.pause/>
      <hh.emit signal_name="S"/>
    </hh.localsignal>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "reincar");
