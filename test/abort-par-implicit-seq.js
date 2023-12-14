"use strict";
"use hopscript";

import * as hh from "@hop/hiphop";

const inSig = {accessibility: hh.IN};
const outSig = {accessibility: hh.OUT};

const prg = <hh.module I=${inSig} O=${outSig}>
  <hh.local L>
    <hh.parallel>
      <hh.abort L>
	<hh.loop>
	  <hh.emit O/>
	  <hh.pause/>
	</hh.loop>
      </hh.abort>
      <hh.sequence>
	<hh.await I/>
	<hh.emit L/>
      </hh.sequence>
    </hh.parallel>
  </hh.local>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "abortpar");
