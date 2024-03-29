"use hopscript"

import * as hh from "@hop/hiphop";

const prg = <hh.module J>
  <hh.local I>
    <hh.Parallel>
      <hh.if I>
	<hh.emit J apply=${function() {return this.I.nowval}} />
      </hh.if>
      <hh.emit I value=${5} />
    </hh.Parallel>
  </hh.local>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parvalued");
