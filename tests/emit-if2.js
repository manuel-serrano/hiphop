"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module A B C>
	<hh.parallel>
	  <hh.loop>
	    <hh.emit A ifApply=${function(){return this.B.nowval > 3}}/>
	    <hh.pause/>
	  </hh.loop>
	  <hh.loop>
	    <hh.if C>
	      <hh.emit B value=${4}/>
	      <hh.emit B value=${3}/>
	    </hh.if>
	    <hh.pause/>
	  </hh.loop>
	</hh.parallel>
      </hh.module>

const m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log

m.react()
m.react()
m.inputAndReact("C")
m.react()
m.inputAndReact("C")
m.inputAndReact("C")

