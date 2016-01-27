"use strict"

var hh = require("hiphop");

try {
   var prg = <hh.module>
     <hh.outputsignal name="O" type="string"/>
     <hh.loop>
       <hh.localsignal name="L" type="string">
	 <hh.emit signal_name="L" exprs=${"foo bar"}/>
	 <hh.emit signal_name="O" exprs=${hh.value("L")}/>
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
