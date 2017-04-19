"use hopscript"

const hh = require("hiphop");

const m = new hh.ReactiveMachine(
   <hh.module S R E>
     <hh.loop>
       <hh.suspend immediate from=S to=R emitWhenSuspended=E>
	 <hh.atom apply=${() => console.log("not suspended!")}/>
       </hh.suspend>
       <hh.pause/>
     </hh.loop>
   </hh.module>
);

m.debug_emitted_func = emitted => {
   console.log(emitted);
   console.log("---------------------");
};
// m.debuggerOn("debug");
// m.stepperOn();
m.react()
m.react()
m.inputAndReact("S");
m.react()
m.react()
m.inputAndReact("R");
m.react()
m.react()
