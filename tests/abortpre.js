"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module O S>
      <hh.loop>
	<hh.abort pre S>
	  <hh.emit S/>
	  <hh.pause/>
	  <hh.emit O/>
	</hh.abort>
	<hh.pause/>
      </hh.loop>
    </hh.module>;

//console.error(prg.pretty_print())

exports.prg = new hh.ReactiveMachine(prg, "abortpre");
