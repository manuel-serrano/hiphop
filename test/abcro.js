"use strict";
"use hopscript";

import * as hh from "@hop/hiphop";

const inSig = {direction: hh.IN};
const outSig = {direction: hh.OUT};

const prg =
    <hh.module A=${inSig} B=${inSig} C=${inSig} R=${inSig} O=${outSig}>
      <hh.loopeach R>
	<hh.parallel>
	  <hh.await A/>
	  <hh.await B/>
	  <hh.await C/>
	</hh.parallel>
	<hh.emit O/>
      </hh.loopeach>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "ABCRO");
