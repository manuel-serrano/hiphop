"use hopscript"

import * as hh from "@hop/hiphop";

const prg = <hh.module O1 O2>
  <hh.loop>
    <hh.local S>
      <hh.if pre S>
	<hh.emit O1/>
	<hh.emit O2/>
      </hh.if>
      <hh.pause/>
      <hh.emit S/>
    </hh.local>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "prepure");
