"use hopscript"

import * as hh from "@hop/hiphop";

const inSig = {accessibility: hh.IN};
const outSig = {accessibility: hh.OUT};

const prg =
    <hh.module I=${inSig} O=${outSig}>
      <hh.loop>
	<hh.sequence>
	  <hh.await I countValue=${3} />
	  <hh.emit O />
	</hh.sequence>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "await3");
