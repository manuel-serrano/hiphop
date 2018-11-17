"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module A B>
	<hh.loop>
	  <hh.emit A ifApply=${function(){return this.B.now}}/>
	  <hh.pause/>
	</hh.loop>
      </hh.module>

const m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log;

m.react()
m.react()
m.inputAndReact("B")
m.react()
m.inputAndReact("B")
m.inputAndReact("B")

