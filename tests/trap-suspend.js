"use hopscript"

const hh = require("hiphop");
const mach = new hh.ReactiveMachine(
   <hh.module L>
     <hh.trap T1>
       <hh.parallel>
	 <hh.exit T1/>
	 <hh.suspend L>
	   <hh.pause/>
	 </hh.suspend>
       </hh.parallel>
     </hh.trap>
     <hh.atom apply=${() => console.log("exit trap")}/>
   </hh.module>
);

mach.react();
