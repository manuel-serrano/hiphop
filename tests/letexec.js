"use hopscript"

const hh = require("hiphop");

const m = new hh.ReactiveMachine(
   <hh.module G=${{initValue: 6}}>
     <hh.local S=${{initValue: 5}}>
       <hh.exec apply=${function() {
	  		   console.log(this.value.S, this.value.G);
       }}/>
     </hh.local>
   </hh.module>);

m.react();
