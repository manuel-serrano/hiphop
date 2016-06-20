"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="O1"/>
  <hh.outputsignal name="O2"/>
  <hh.let>
    <hh.signal name="S"/>
    <hh.loop>
      <hh.present testPre signal="S">
	<hh.emit signal="O1"/>
	<hh.emit signal="O2"/>
      </hh.present>
      <hh.pause/>
      <hh.emit signal="S"/>
    </hh.loop>
  </hh.let>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "prepure2");
