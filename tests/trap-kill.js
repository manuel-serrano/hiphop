"use hopscript"

const hh = require("hiphop");

const mach = new hh.ReactiveMachine(
   <hh.module>
     <hh.trap T>
       <hh.parallel>
	 <hh.sequence>
	   <hh.exec apply=${function() {
	      setTimeout(this.notifyAndReact, 500) }}/>
	   <hh.exit T/>
	 </hh.sequence>
	 <hh.exec apply=${function() {
	    setTimeout(this.notifyAndReact, 1000)}}
		  kill=${function() {
		     console.log("been killed");
		  }}/>
       </hh.parallel>
     </hh.trap>
   </hh.module>
);

mach.react();
