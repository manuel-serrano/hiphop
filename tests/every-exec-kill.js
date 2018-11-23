"use hopscript"

const hh = require("hiphop");
const mach = new hh.ReactiveMachine(
   <hh.module S>
     <hh.every S>
       <hh.atom apply=${() => console.log("every")}/>
       <hh.exec apply=${function() {
	  console.log("start", this.id);
	    setTimeout(this.notifyAndReact, 500);
	 }}
		  killApply=${function() {
		     console.log("killed", this.id);
		  }}

      />

     </hh.every>
   </hh.module>
);

mach.react();
console.log('----');
mach.inputAndReact("S");
console.log('----');
setTimeout(() => mach.inputAndReact("S"), 200);
