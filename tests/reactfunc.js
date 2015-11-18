"use hopscript"

var rjs = require("../lib/reactive-js.js");

var i1 = new rjs.Signal("I1");
var i2 = new rjs.ValuedSignal("I2", "number");
var o1 = new rjs.Signal("O1");
var o11 = new rjs.Signal("O11");
var o2 = new rjs.ValuedSignal("O2", "number");

function foo(name) {
   console.log("hi from foo signal", name, "is set!")
}

function bar(name) {
   console.log("hi from bar signal", name, "is set!")
}

function foo2(name, value) {
   console.log("hi from foo2 signal", name, "is set with", value, "!")
}

function bar2(name, value) {
   console.log("hi from bar2 signal", name, "is set with", value, "!")
}

var prg = <rjs.reactivemachine name="reactfunc" debug>
			       <rjs.inputsignal ref=${i1}/>
  <rjs.inputsignal ref=${i2}/>
  <rjs.outputsignal ref=${o1} react_functions=${foo}/>
  <rjs.outputsignal ref=${o11} react_functions=${[foo,bar]}/>
  <rjs.outputsignal ref=${o2} react_functions=${[foo2, bar2]}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.present signal_name="I1">
	<rjs.sequence>
	  <rjs.emit signal_name="O1"/>
	  <rjs.emit signal_name="O11"/>
	</rjs.sequence>
      </rjs.present>
      <rjs.present signal_name="I2">
	<rjs.emit signal_name="O2"
		  expr=${<rjs.sigexpr get_value signal_name="I2"/>}/>
      </rjs.present>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>
exports.prg = prg;
