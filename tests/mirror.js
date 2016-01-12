"use hopscript"

var rjs = require("hiphop");

function foo(evt) {
   console.log("hi from foo signal", evt.signal, "is set!")
}

function bar(evt) {
   console.log("hi from bar signal", evt.signal, "is set with value",
	       evt.value, "!")
}

var prg = <rjs.reactivemachine debug name="mirror">
  <rjs.inputsignal name="I1" />
  <rjs.outputsignal name="O1"/>
  <rjs.inputsignal name="I2" type="number"/>
  <rjs.outputsignal name="O2" type="number"/>
  <rjs.inputsignal name="I3" type="string"/>
  <rjs.outputsignal name="O3" type="string"/>
  <rjs.inputsignal name="I4" type="number" />
  <rjs.outputsignal name="O4" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.present signal_name="I1">
	<rjs.emit signal_name="O1"/>
      </rjs.present>
      <rjs.present signal_name="I2">
	<rjs.emit signal_name="O2" exprs=${rjs.value("I2")}/>
      </rjs.present>
      <rjs.present signal_name="I3">
	<rjs.emit signal_name="O3" exprs=${rjs.value("I3")}/>
      </rjs.present>
      <rjs.present signal_name="I4">
	<rjs.emit signal_name="O4" exprs=${rjs.value("I4")}/>
      </rjs.present>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>

prg.addEventListener("O1", foo);
prg.addEventListener("O2", bar);
prg.addEventListener("O3", bar);
prg.addEventListener("O4", bar);

exports.prg = prg;
