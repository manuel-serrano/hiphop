"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module I=${{accessibility: hh.IN}} O>
      <hh.every countValue=2 I>
	<hh.emit O/>
      </hh.every>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "everydelay");
