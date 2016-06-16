"use strict"

var hh = require("hiphop");

try {
   var prg = <hh.module>
     <hh.outputsignal name="O" valued/>
     <hh.loop>
       <hh.let>
	 <hh.signal name="L" valued/>
	 <hh.emit signal="L" arg=${"foo bar"}/>
	 <hh.emit signal="O" arg=${hh.value("L")}/>
       </hh.let>
     </hh.loop>
   </hh.module>;

   var m = new hh.ReactiveMachine(prg, "instloop");

   m.react();
   m.react();
   m.react();
   m.react();
} catch (e) {
   console.log(e.message)
}
