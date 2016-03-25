"use strict"

var hh = require("hiphop");

try {
   var prg = <hh.module>
     <hh.outputsignal name="O" valued/>
     <hh.loop>
       <hh.localsignal name="L" valued>
	 <hh.emit signal_name="L" arg=${"foo bar"}/>
	 <hh.emit signal_name="O" arg=${hh.value("L")}/>
       </hh.localsignal>
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
