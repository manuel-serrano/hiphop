"use hopscript";

import * as hh from "@hop/hiphop";

const prg =
      <hh.module A B>
	<hh.emit A B/>
      </hh.module>

const m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log;

m.react()
m.react()
