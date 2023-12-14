"use hopscript"

import * as hh from "@hop/hiphop";

const prg = <hh.module I=${{accessibility: hh.IN}} J O>
  <hh.sequence>
    <hh.suspend I>
      <hh.loop>
	<hh.sequence>
	  <hh.emit O/>
	  <hh.pause/>
	</hh.sequence>
      </hh.loop>
    </hh.suspend>
    <hh.emit J/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "SUSPEND");
