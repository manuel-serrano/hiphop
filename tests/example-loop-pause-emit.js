"use hopscript"

import * as hh from "@hop/hiphop";

const prg = <hh.module I=${{accessibility: hh.IN}} S>
  <hh.loop>
    <hh.Sequence>
      <hh.await I/>
      <hh.pause/>
      <hh.emit S/>
    </hh.Sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "looppauseemit");
