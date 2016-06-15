"use strict"

var hh = require("hiphop");

var func = function(arg1, arg2) {
   console.log("atom works!", arg1, arg2);
}

var prg = <hh.module>
  <hh.loop>
    <hh.localsignal name="L" valued>
      <hh.emit signal="L" arg=${"foo bar"}/>
      <hh.pause/>
      <hh.atom func=${func} arg0=1 arg1=${hh.value("L")}/>
    </hh.localsignal>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "atom");
