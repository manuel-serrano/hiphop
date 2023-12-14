"use hopscript"

import * as hh from "@hop/hiphop";

const inSig = {accessibility: hh.IN};
const outSig = {accessibility: hh.OUT};

const prg = <hh.module A=${inSig} B=${inSig} O=${outSig}>
  <hh.sequence>
    <hh.parallel>
      <hh.await A/>
      <hh.await B/>
    </hh.parallel>
    <hh.emit O/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "awaitpar");
