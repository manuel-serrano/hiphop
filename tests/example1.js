"use strict"

var reactive = require("../reactive-kernel.js");
var inspector = require("../inspector.js");
var rjs = require("../xml-compiler.js");

var sigS = new reactive.Signal("S", false);
sigS.local = true;
var sigT = new reactive.Signal("T", false);

var prg = <rjs.reactivemachine name="example1">
  <rjs.sequence>
    <rjs.pause/>
    <rjs.emit signal=${sigS}/>
    <rjs.present signal=${sigS}>
      <rjs.emit signal=${sigT}/>
    </rjs.present>
  </rjs.sequence>
</rjs.ReactiveMachine>

for (var i = 0; i < 5; i++)
   prg.react(i);

prg.reset();

for (var i = 0; i < 5; i++)
   prg.react(i);
