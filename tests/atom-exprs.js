"use strict"

var rjs = require("hiphop");

var func = function(arg1, arg2) {
   console.log("atom works!", arg1, arg2);
}

var prg = <rjs.ReactiveMachine debug name="atom">
  <rjs.loop>
    <rjs.localsignal name="L" type="string">
      <rjs.emit signal_name="L" exprs=${"foo bar"}/>
      <rjs.pause/>
      <rjs.atom func=${func} exprs=${[1, rjs.value("L")]}/>
    </rjs.localsignal>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
