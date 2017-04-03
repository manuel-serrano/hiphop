"use hopscript"

var hh = require("hiphop");

var m1 = <hh.module T W V Z>
     <hh.parallel>
       <hh.if T>
	 <hh.local L>
	   <hh.sequence>
	     <hh.emit L/>
	     <hh.emit V/>
	   </hh.sequence>
	 </hh.local>
       </hh.if>
       <hh.if W>
	 <hh.emit Z/>
       </hh.if>
     </hh.parallel>
   </hh.module>;

var inSig={accessibility: hh.IN};
var m2 = <hh.module S=${inSig} U=${inSig} A B>
  <hh.sequence>
    <hh.local L>
      <hh.emit L/>
    </hh.local>
    <hh.run module=${m1} T=S W=U V=A Z=B/>
    <hh.run module=${m1} T=S W=U V=A Z=B/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(m2, "run22");
