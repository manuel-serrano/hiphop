"use hopscript"

import * as hh from "@hop/hiphop";

const prg = <hh.module J>
  <hh.local I>
    <hh.parallel>
      <hh.emit I/>
      <hh.sequence>
	<hh.await I/>
	<hh.emit J/>
      </hh.sequence>
    </hh.parallel>
  </hh.local>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel");
