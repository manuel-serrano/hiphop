"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.outputsignal name="O"/>
      <hh.outputsignal name="S"/>
      <hh.loop>
	<hh.abort test_pre signal="S">
	  <hh.emit signal="S"/>
	  <hh.pause/>
	  <hh.emit signal="O"/>
	</hh.abort>
	<hh.pause/>
      </hh.loop>
    </hh.module>;

//console.error(prg.pretty_print())

exports.prg = new hh.ReactiveMachine(prg, "abortpre");
