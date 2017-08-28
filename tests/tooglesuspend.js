"use hopscript"

const hh = require("hiphop");

const mach = new hh.ReactiveMachine(
   <hh.module toogle>
     <hh.suspend toggleSignal=toogle>
       <hh.loop>
	 <hh.atom apply=${function() {
	    console.log("plop");
	 }}/>
	 <hh.pause/>
       </hh.loop>
     </hh.suspend>
   </hh.module>
);

mach.debug_emitted_func = console.log;

mach.react();
mach.react();
mach.inputAndReact('toogle');
mach.react();
mach.react();
mach.inputAndReact('toogle');
mach.react();
mach.react();
