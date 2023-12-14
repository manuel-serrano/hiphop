"use hopscript"

import * as hh from "@hop/hiphop";

const inSig={accessibility: hh.IN};
const outSig={accessibility: hh.OUT};

const prg = <hh.module A=${inSig} B=${inSig} O=${outSig}>
  <hh.await A/>
  <hh.await B/>
  <hh.emit O/>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "awaitseq");
