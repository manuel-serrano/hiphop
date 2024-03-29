"use hopscript"

import * as hh from "@hop/hiphop";

const m =
    <hh.module S=${{accessibility: hh.IN}} O F W>
      <hh.weakabort immediate S>
	<hh.loop>
	  <hh.emit O/>
	  <hh.pause/>
	  <hh.emit W/>
	</hh.loop>
      </hh.weakabort>
      <hh.emit F/>
    </hh.module>

exports.prg = new hh.ReactiveMachine(m, "wabortimmediate")
