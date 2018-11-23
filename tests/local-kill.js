"use hopscript"

const hh = require("hiphop");

const mach = new hh.ReactiveMachine(
   <hh.module A>
     <hh.trap T>
       <hh.parallel>
	 <hh.loop>
	   <hh.local FOO>
	     <hh.exec apply=${function() {
	     			 setTimeout(this.notify.bind( this ), 100);
	     		      }}
	     	      killApply=${function() {
	     		 	console.log("killed");
		      	     }}/>
	     <hh.atom apply=${() => console.log('tick 10s')}/>
	   </hh.local>
	 </hh.loop>

	 <hh.sequence>
	   <hh.exec apply=${function() {
	      		       setTimeout(this.notify.bind( this ), 10);
	   		    }}/>
	   <hh.exit T/>
	 </hh.sequence>
       </hh.parallel>
     </hh.trap>
     <hh.emit A/>
     <hh.atom apply=${() => console.log("end")}/>
   </hh.module>
);

mach.debug_emitted_func = console.log;

mach.react();
