"use hopscript"

import * as hh from "@hop/hiphop";

const inSig = {accessibility: hh.IN};
const outSig = {accessibility: hh.OUT};

const prg =
    <hh.module I=${inSig} O=${outSig}>
      <hh.loop>
	<hh.await I countValue=3 />
	<hh.emit O />
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "await3");

