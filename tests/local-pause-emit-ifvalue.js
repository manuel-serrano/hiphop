"use hopscript"

const hh = require("hiphop");


const prg =
      <hh.module>
	<hh.loop>
	  <hh.let L>
	    <hh.pause/>
	    <hh.emit L/>
	    <hh.if apply=${function(){return ! this.value.L}}>
	      <hh.atom apply=${function(){console.log("L:", this.value.L)}}/>
	    </hh.if>
	  </hh.let>
	</hh.loop>
      </hh.module>;

const m = new hh.ReactiveMachine(prg)

m.react();
m.react();m.react();m.react();
