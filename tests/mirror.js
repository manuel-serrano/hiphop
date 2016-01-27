"use hopscript"

var hh = require("hiphop");

function foo(evt) {
   console.log("hi from foo signal", evt.signal, "is set!")
}

function bar(evt) {
   console.log("hi from bar signal", evt.signal, "is set with value",
	       evt.value, "!")
}

var prg = <hh.module>
  <hh.inputsignal name="I1" />
  <hh.outputsignal name="O1"/>
  <hh.inputsignal name="I2" type="number"/>
  <hh.outputsignal name="O2" type="number"/>
  <hh.inputsignal name="I3" type="string"/>
  <hh.outputsignal name="O3" type="string"/>
  <hh.inputsignal name="I4" type="number" />
  <hh.outputsignal name="O4" type="number"/>
  <hh.loop>
    <hh.sequence>
      <hh.present signal_name="I1">
	<hh.emit signal_name="O1"/>
      </hh.present>
      <hh.present signal_name="I2">
	<hh.emit signal_name="O2" exprs=${hh.value("I2")}/>
      </hh.present>
      <hh.present signal_name="I3">
	<hh.emit signal_name="O3" exprs=${hh.value("I3")}/>
      </hh.present>
      <hh.present signal_name="I4">
	<hh.emit signal_name="O4" exprs=${hh.value("I4")}/>
      </hh.present>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>

var m = new hh.ReactiveMachine(prg, "mirror");
m.addEventListener("O1", foo);
m.addEventListener("O2", bar);
m.addEventListener("O3", bar);
m.addEventListener("O4", bar);

exports.prg = m
