"use hopscript"

var hh = require("hiphop");

function minus(arg1, arg2) { return arg1 - arg2 };
function plus(arg1, arg2) { return arg1 + arg2 };

var prg = <hh.module I O=${{initValue: 5}} U>
  <hh.loop>
    <hh.emit I apply=${function() {return plus(3 - 2, 5)}}/>
    <hh.emit O apply=${function() {return plus(this.I.nowval, 7)}}/>
    <hh.emit U apply=${function() {return minus(this.O.preval, 1)}}/>
    <hh.pause/>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "value2");
