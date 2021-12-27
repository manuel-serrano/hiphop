"use hopscript"

import * as hh from "@hop/hiphop";

const inSig = {accessibility: hh.IN};

const prg =
    <hh.module I1=${inSig} O1 I2=${inSig} O2>
      <hh.loop>
	<hh.if apply=${function() {return this.I1.now}}>
	  <hh.emit O1/>
	</hh.if>
	<hh.if apply=${function() {return this.I2.nowval > 2}}>
	  <hh.emit O2/>
	</hh.if>
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "if1");
