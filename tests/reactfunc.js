"use hopscript"

var hh = require("hiphop");

function foo(evt) {
   console.log("hi from foo signal", evt.type, "is set!")
}

function bar(evt) {
   console.log("hi from bar signal", evt.type, "is set!")
}

function foo2(evt) {
   console.log("hi from foo2 signal", evt.type, "is set with", evt.nowval, "!")
}

function bar2(evt) {
   console.log("hi from bar2 signal", evt.type, "is set with", evt.nowval, "!")
}

var inSig={accessibility: hh.IN};
var prg = <hh.module I1=${inSig} I2=${inSig} O1 O11 O2>
  <hh.loop>
    <hh.sequence>
      <hh.if I1>
	<hh.sequence>
	  <hh.emit O1/>
	  <hh.emit O11/>
	</hh.sequence>
      </hh.if>
      <hh.if I2>
	<hh.emit O2 apply=${function() {return this.I2.nowval}}/>
      </hh.if>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>

var m = new hh.ReactiveMachine(prg, "reactfunc");

m.addEventListener("O1", foo);
m.addEventListener("O11", foo);
m.addEventListener("O11", bar);
m.addEventListener("O2", foo2)
m.addEventListener("O2", bar2);

exports.prg = m;
