"use hopscript"

import * as hh from "@hop/hiphop";

const prg =
    <hh.module I=${{accessibility:hh.IN}} O>
      <hh.every immediate I>
	<hh.emit O/>
      </hh.every>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "everyimmediate");
