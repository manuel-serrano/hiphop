"use hopscript"

import * as hh from "@hop/hiphop";

function foo(evt) {
   console.log("foo called by", evt.type, "with value", evt.nowval);
}

const inSig = {accessibility: hh.IN};
const outSig = {accessibility: hh.OUT};

const prg = <hh.module I=${inSig} O=${outSig}>
    <hh.await I />
    <hh.emit O apply=${function() {return this.I.nowval}}/>
</hh.module>;

const m = new hh.ReactiveMachine(prg, "awaitvalued");
m.addEventListener("O", foo);

exports.prg = m;
