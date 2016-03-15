"use hopscript"

var hh = require("hiphop");

try {
   var prg =
       <hh.module>
	 <hh.inputsignal name="A"/>
	 <hh.inputsignal name="B"/>
	 <hh.outputsignal name="O"/>
	 <hh.await signal_name="A"/>
	 <hh.inputsignal name="C"/>
	 <hh.await signal_name="B"/>
	 <hh.emit signal_name="O"/>
       </hh.module>;
} catch (e) {
   console.log(e.message);
}
