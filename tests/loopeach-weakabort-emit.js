"use hopscript"

const hh = require("hiphop");

const machine = new hh.ReactiveMachine(
   <hh.module A B>
     <hh.loopeach A>
       <hh.weakabort B>
	 <hh.nothing/>
	 <hh.parallel>
	   <hh.sequence>
	     <hh.pause/>
	     <hh.emit B/>
	   </hh.sequence>
	 </hh.parallel>
       </hh.weakabort>
       <hh.atom apply=${function() {
	  console.log("weakabort terminated 1.");
       }}/>
     </hh.loopeach>
   </hh.module>
);

machine.react();
machine.react();
machine.react();
//console.log(machine.pretty_print());

const machine2 = new hh.ReactiveMachine(
   <hh.module A B>
     <hh.loopeach A>
       <hh.weakabort B>
	 <hh.parallel>
	   <hh.sequence>
	     <hh.pause/>
	     <hh.emit B/>
	   </hh.sequence>
	 </hh.parallel>
       </hh.weakabort>
       <hh.atom apply=${function() {
	  console.log("weakabort terminated 2.");
       }}/>
     </hh.loopeach>
   </hh.module>
);

machine2.react();
machine2.react();
machine2.react();
machine2.react();
//console.log(machine2.pretty_print());

const machine3 = new hh.ReactiveMachine(
   <hh.module A B>
     <hh.loopeach A>
       <hh.trap T>
	 <hh.parallel>
	   <hh.sequence>
	     <hh.await B/>
	     <hh.exit T/>
	   </hh.sequence>
	   <hh.parallel>
	     <hh.sequence>
	       <hh.pause/>
	       <hh.emit B/>
	     </hh.sequence>
	   </hh.parallel>
	 </hh.parallel>
       </hh.trap>
       <hh.atom apply=${function() {
	  console.log("weakabort terminated 3.");
       }}/>
     </hh.loopeach>
   </hh.module>
);

machine3.react();
machine3.react();
machine3.react();
machine3.react();
