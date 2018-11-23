"use hopscript"

const hh = require("hiphop");

const mach = new hh.ReactiveMachine(
   <hh.module>
     <hh.trap T>
       <hh.parallel>
	 <hh.sequence>
	   <hh.exec apply=${function() {
	      		       setTimeout(this.notify.bind( this ), 500) }}/>
	   <hh.exit T/>
	 </hh.sequence>
	 <hh.exec apply=${function() {
	    		     setTimeout(this.notify.bind( this ), 1000)}}
		  killApply=${function() {
		     console.log("been killed");
		  }}/>
       </hh.parallel>
     </hh.trap>
   </hh.module>
);

mach.react();
