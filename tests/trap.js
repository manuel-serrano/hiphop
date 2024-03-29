"use hopscript"

import * as hh from "@hop/hiphop";

const prg =
 <hh.module A B C>
  <hh.sequence>
    <hh.emit A/>
    <hh.trap T>
      <hh.sequence>
	<hh.exit T/>
	<hh.emit B/>
      </hh.sequence>
    </hh.trap>
    <hh.emit C/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trapsimple");
