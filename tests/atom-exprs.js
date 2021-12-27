"use strict"

import * as hh from "@hop/hiphop";

const prg =
    <hh.module>
      <hh.loop>
	<hh.local L>
	  <hh.emit L value=${"foo bar"}/>
	  <hh.pause/>
	  <hh.atom apply=${function() {
	     console.log("atom works! value of L is", this.L.nowval);
	  }}/>
	</hh.local>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "atom");
