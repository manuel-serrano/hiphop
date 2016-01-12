"use hopscript"

var hh = require("hiphop");

try {
var prg =
    <hh.reactivemachine debug name="everydelay">
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.every immediate count=2 signal_name="I">
	<hh.emit signal_name="O"/>
      </hh.every>
    </hh.reactivemachine>;
} catch (e) {
   console.log(e.message)
}
