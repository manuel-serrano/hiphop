"use hopscript"

const hh = require("hiphop");

const m = new hh.ReactiveMachine(
   <hh.module>
     <hh.iosignal name="G" value=6/>
     <hh.let>
       <hh.signal name="S" value=5/>
       <hh.exec start=${function() {
	  console.log(this.value.S, this.value.G);
       }}/>
     </hh.let>
   </hh.module>);

m.react();
