"use hopscript"

import * as hh from "@hop/hiphop";

const prg =
    <hh.module O=${{initValue: 5, combine: (x, y) => x + y}}>
      <hh.loop>
	<hh.emit O value=${5} />
	<hh.emit O value=${10} />
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "value1");
