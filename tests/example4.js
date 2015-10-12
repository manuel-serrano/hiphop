"use strict"

var reactive = require("../reactive-kernel.js");
var inspector = require("../inspector.js");
var rjs = require("../xml-compiler.js");

var sigA = new reactive.Signal("A", false);
var sigS = new reactive.Signal("S", false);
sigS.local = true;
var sigT = new reactive.Signal("T", false);
var sigV = new reactive.Signal("V", false);

var prg = <rjs.reactivemachine name="example4">
  <rjs.loop>
    <rjs.abort signal=${sigA}>
      <rjs.sequence>
	<rjs.emit signal=${sigS}/>
	<rjs.present signal=${sigS}>
	  <rjs.emit signal=${sigT}/>
	</rjs.present>
	<rjs.pause/>
	<rjs.emit signal=${sigV}/>
      </rjs.sequence>
    </rjs.abort>
  </rjs.loop>
</rjs.ReactiveMachine>

for (var i = 0; i < 5; i++)
   prg.react(i);

sigA.set_from_host(true, false);

for (var i = 0; i < 5; i++)
   prg.react(i);

prg.reset();

for (var i = 0; i < 5; i++)
   prg.react(i);
