"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module I=${{accessibility: hh.IN}} O>
      <hh.loopeach I>
	<hh.emit O/>
      </hh.loopeach>
    </hh.module>
;

exports.prg = new hh.ReactiveMachine(prg, "loopeach");
