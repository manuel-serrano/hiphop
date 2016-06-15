"use hopscript"

var hh = require("hiphop");

try {
   var prg =
       <hh.module>
	 <hh.inputsignal name="A"/>
	 <hh.inputsignal name="B"/>
	 <hh.outputsignal name="O"/>
	 <hh.await signal="A"/>
	 <hh.inputsignal name="C"/>
	 <hh.await signal="B"/>
	 <hh.emit signal="O"/>
       </hh.module>;
} catch (e) {
   console.log(e.message);
}
