"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="I1" />
  <hh.outputsignal name="O1" />
  <hh.inputsignal name="I2" valued />
  <hh.outputsignal name="O2" />
  <hh.loop>
    <hh.sequence>
      <hh.if args=${hh.present("I1")}>
	<hh.emit signal_name="O1"/>
      </hh.if>
      <hh.if func=${x => x > 2} args=${hh.value("I2")}>
	<hh.emit signal_name="O2"/>
      </hh.if>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "if1");
