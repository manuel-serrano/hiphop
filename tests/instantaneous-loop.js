"use strict"

var hh = require("hiphop");

try {
   var prg = <hh.module O>
     <hh.loop>
       <hh.local L>
	 <hh.emit L value=${"foo bar"}/>
	 <hh.emit O apply=${function() {return this.L.nowval}}/>
       </hh.local>
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
