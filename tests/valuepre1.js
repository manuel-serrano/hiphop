"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.outputsignal name="I" type="number"/>
      <hh.outputsignal name="O" type="number" init_value=5 />
      <hh.outputsignal name="U" type="number"/>
      <hh.loop>
	<hh.emit signal_name="I" exprs=3 />
	<hh.emit signal_name="O" exprs=${hh.value("I")}/>
	<hh.emit signal_name="U" exprs=${hh.preValue("O")}/>
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "valuepre1");
