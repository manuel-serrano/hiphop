"use hopscript"

var hh = require("hiphop");

var m1 = <hh.module S U W Z>
  <hh.parallel>
    <hh.if S>
      <hh.emit W/>
    </hh.if>
    <hh.if U>
      <hh.emit Z/>
    </hh.if>
  </hh.parallel>
</hh.module>;

var inSig={accessibility: hh.IN}
var run2 = <hh.module S=${inSig} U=${inSig} A B>
  <hh.run module=${m1} S U W=A Z=B/>
</hh.module>;

exports.prg = new hh.ReactiveMachine(run2, "run2");
