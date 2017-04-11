"use hopscript"

const hh = require("hiphop");

const pauseModule =
      <hh.module>
	<hh.pause/>
      </hh.module>;

const m = new hh.ReactiveMachine(
   <hh.module>
     <hh.loop>
       <hh.atom apply=${() => console.log(">>> start")}/>
       <hh.if value=1>
	 <hh.sequence>
	   <hh.run module=${pauseModule}/>
	 </hh.sequence>
	 <hh.pause/>
       </hh.if>     
       <hh.atom apply=${() => console.log(">>> end")}/>
     </hh.loop>
   </hh.module>
);

m.react();
setTimeout(() => m.react(), 200);
