"use hopscript"

function plus (x, y) { return x+y };

import * as hh from "@hop/hiphop";

const inSig={accessibility: hh.IN};

const prg =
    <hh.module I=${inSig} R=${inSig} O=${{initValue: 0}}>
      <hh.loop>
	<hh.abort R>
          <hh.sequence>
            <hh.await I/>
            <hh.emit O apply=${function() {return plus(this.O.preval, 1)}}/>
            <hh.pause/>
          </hh.sequence>
	</hh.abort>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "Incr");
