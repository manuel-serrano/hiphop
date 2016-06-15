"use hopscript"

var hh = require("hiphop");

try {
var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.every immediate count=2 signal="I">
	<hh.emit signal="O"/>
      </hh.every>
    </hh.module>;
} catch (e) {
   console.log(e.message)
}
