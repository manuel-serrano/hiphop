const hh = require("hiphop");

const m = new hh.ReactiveMachine(
   <hh.module  s=${{accessibility: 2  }}>
     <hh.loop>
       <hh.sequence>
	 <hh.local l=${{initApply:function(){return 2}}}>

	   <hh.emit s apply=${function() {
	      return this.value.l;
	   }}/>
	   <hh.pause/>
	 </hh.local>
       </hh.sequence>
     </hh.loop>
   </hh.module>
);
m.addEventListener("s", function (evt) { console.log(evt); });
m.react();
m.react();
