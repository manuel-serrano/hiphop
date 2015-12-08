"use hopscript"

var rjs = require("hiphop");

function foo(evt) {
   console.log("hi from foo signal", evt.signal, "is set!")
}

function bar(evt) {
   console.log("hi from bar signal", evt.signal, "is set!")
}

function foo2(evt) {
   console.log("hi from foo2 signal", evt.signal, "is set with", evt.value, "!")
}

function bar2(evt) {
   console.log("hi from bar2 signal", evt.signal, "is set with", evt.value, "!")
}

var prg = <rjs.reactivemachine debug name="reactfunc">
  <rjs.inputsignal name="I1" />
  <rjs.inputsignal name="I2" type="number"/>
  <rjs.outputsignal name="O1" react_functions=${foo}/>
  <rjs.outputsignal name="O11" react_functions=${[foo,bar]}/>
  <rjs.outputsignal name="O2" type="number" react_functions=${[foo2, bar2]}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.present signal_name="I1">
	<rjs.sequence>
	  <rjs.emit signal_name="O1"/>
	  <rjs.emit signal_name="O11"/>
	</rjs.sequence>
      </rjs.present>
      <rjs.present signal_name="I2">
	<rjs.emit signal_name="O2" exprs=${rjs.value("I2")}/>
      </rjs.present>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>
exports.prg = prg;
