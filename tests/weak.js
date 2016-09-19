"use hopscript"

var hh = require("hiphop");

var m =
    <hh.module S=${{accessibility: hh.IN}} O F W>
      <hh.weakabort S>
	<hh.loop>
	  <hh.emit O/>
	  <hh.pause/>
	  <hh.emit W/>
	</hh.loop>
      </hh.weakabort>
      <hh.emit F/>
    </hh.module>

exports.prg = new hh.ReactiveMachine(m, "wabort");
