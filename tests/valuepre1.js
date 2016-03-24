"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.outputsignal name="I" valued/>
      <hh.outputsignal name="O"  init_value=5 />
      <hh.outputsignal name="U" valued/>
      <hh.loop>
	<hh.emit signal_name="I" arg=3 />
	<hh.emit signal_name="O" arg=${hh.value("I")}/>
	<hh.emit signal_name="U" arg=${hh.preValue("O")}/>
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "valuepre1");
