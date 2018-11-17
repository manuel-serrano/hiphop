"use hopscript"

const hh = require("hiphop")

const prg =
      <hh.module A=${{combine: (x, y) => x + y}}>
	<hh.parallel>
	  <hh.loop>
	    <hh.emit A value=${0} />
	    <hh.pause/>
	  </hh.loop>

	  <hh.loop>
	    <hh.emit A value=${1} />
	    <hh.atom apply=${function() {
	       console.log(this.A.nowval);
	    }}/>
	    <hh.pause/>
	  </hh.loop>

	  <hh.loop>
	    <hh.emit A value=${2} />
	    <hh.atom apply=${function() {
	       console.log(this.A.nowval);
	    }}/>
	    <hh.pause/>
	  </hh.loop>
	</hh.parallel>
    </hh.module>;

let machine = new hh.ReactiveMachine(prg, "error2");

machine.debug_emitted_func = console.log;
machine.react()
machine.react()
machine.react()
machine.react()
machine.react()
