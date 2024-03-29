"use hopscript"

import * as hh from "@hop/hiphop";

const prg = <hh.module O>
  <hh.loop>
    <hh.emit O value=${5} />
    <hh.pause/>
    <hh.emit O />
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "emitnovalue");
