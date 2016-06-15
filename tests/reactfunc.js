"use hopscript"

var hh = require("hiphop");

function foo(evt) {
   console.log("hi from foo signal", evt.signalName, "is set!")
}

function bar(evt) {
   console.log("hi from bar signal", evt.signalName, "is set!")
}

function foo2(evt) {
   console.log("hi from foo2 signal", evt.signalName, "is set with", evt.signalValue, "!")
}

function bar2(evt) {
   console.log("hi from bar2 signal", evt.signalName, "is set with", evt.signalValue, "!")
}

var prg = <hh.module>
  <hh.inputsignal name="I1" />
  <hh.inputsignal name="I2" valued/>
  <hh.outputsignal name="O1"/>
  <hh.outputsignal name="O11"/>
  <hh.outputsignal name="O2" valued/>
  <hh.loop>
    <hh.sequence>
      <hh.present signal="I1">
	<hh.sequence>
	  <hh.emit signal="O1"/>
	  <hh.emit signal="O11"/>
	</hh.sequence>
      </hh.present>
      <hh.present signal="I2">
	<hh.emit signal="O2" arg=${hh.value("I2")}/>
      </hh.present>
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
