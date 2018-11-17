"use hopscript"

const hh = require("hiphop");


const prg =
      <hh.module>
	<hh.loop>
	  <hh.local L>
	    <hh.pause/>
	    <hh.emit L/>
	    <hh.if apply=${function(){return ! this.L.nowval}}>
	      <hh.atom apply=${function(){console.log("L:", this.L.nowval)}}/>
	    </hh.if>
	  </hh.local>
	</hh.loop>
      </hh.module>;

const m = new hh.ReactiveMachine(prg)

m.react();
m.react();m.react();m.react();
