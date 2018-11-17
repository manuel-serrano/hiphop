"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module AUX=${{reinitValue: 1,
			combine: (a, b) => (a * b) + 1}}
		 O=${{reinitApply: function() {console.log("REINIT"); return 2},
		      combine: (a, b) => a * b}}>
	<hh.emit O value=${5}/>
	<hh.emit AUX value=${245}/>
	<hh.emit AUX value=${1}/>
	<hh.pause/>
	<hh.loop>
	  <hh.emit O apply=${function() {return this.O.preval + 1}}/>
	  <hh.emit AUX/>
	  <hh.pause/>
	</hh.loop>
      </hh.module>;

const machine = new hh.ReactiveMachine(prg, "reinit");
machine.debug_emitted_func = console.log

machine.react()
machine.react()
machine.react()
machine.react()


