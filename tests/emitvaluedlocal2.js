"use hopscript"

import * as hh from "@hop/hiphop";

function sum(arg1, arg2) {
   return arg1 + arg2;
}

const prg = <hh.module O>
  <hh.loop>
    <hh.local S=${{initValue: 1}}>
      <hh.emit S apply=${function() {return this.S.preval + 1}}/>
      <hh.emit O apply=${function() {return this.S.nowval}}/>
    </hh.local>
    <hh.pause/>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "emitvaluedlocal2");
