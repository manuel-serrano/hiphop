"use hopscript"

var hh = require("hiphop");

var s1 = true;
var s2 = false;

var prg =
    <hh.module O1 O2>
      <hh.loop>
	<hh.if value=${s1}>
	  <hh.emit O1/>
	</hh.if>
	<hh.if value=${s2}>
	  <hh.emit O2/>
	</hh.if>
	<hh.pause/>
      </hh.loop>
    </hh.module>

let m = new hh.ReactiveMachine(prg);

console.log(m.react());
s1=false; // didnt change anyting
console.log(m.react());
