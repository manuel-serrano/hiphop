"use hopscript"

import * as hh from "@hop/hiphop";

const m1 = <hh.module S U W Z>
  <hh.parallel>
    <hh.emit W ifApply=${function() {return this.S.now}}/>
    <hh.emit Z ifApply=${function() {return this.U.now}}/>
  </hh.parallel>
</hh.module>;

const run2 = <hh.module S U A B>
  <hh.parallel id="par">
    <hh.run module=${m1} S U W=A Z=B/>
    <hh.halt/>
  </hh.parallel>
</hh.module>;

const m = new hh.ReactiveMachine(run2, "run2");
m.debug_emitted_func = console.log

//console.log(m.pretty_print());
console.log("m.inputAndReact(S)");
m.inputAndReact("S")

//m.react();
m.getElementById("par").appendChild(<hh.run module=${m1} S U Z=A/>);

console.log("==================== ADD RUN PARALLEL ==================");

//console.log(m.pretty_print());
console.log("m.inputAndReact(U)");
m.inputAndReact("U")
