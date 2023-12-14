"use hopscript";

import * as hh from "@hop/hiphop";

const prg =
<hh.module O>
  <hh.loop>
    <hh.local S>
      <hh.if S>
	<hh.emit O/>
      </hh.if>
      <hh.pause/>
      <hh.emit S/>
    </hh.local>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "reincar");
