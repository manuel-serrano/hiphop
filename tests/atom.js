"use strict"

var rjs = require("../xml-compiler.js");

var func = function() {
   console.log("atom works!");
}

var prg = <rjs.ReactiveMachine name="atom">
  <rjs.loop>
    <rjs.sequence>
      <rjs.pause/>
      <rjs.atom func=${func}/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
