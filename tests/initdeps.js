"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module B=${{initApply: function() {return 5}}}
		 A=${{initApply: function() {return this.B.nowval}}}>
	<hh.emit A/>
	<hh.pause/>
	<hh.local Y=${{initApply: function() {return this.B.nowval}}}>
	  <hh.local X=${{initApply: function() {return this.Y.nowval}}}>
            <hh.parallel>
	      <hh.emit X/>
	    </hh.parallel>
	    <hh.emit A apply=${function() {return this.X.nowval}}/>
	  </hh.local>
	</hh.local>
      </hh.module>

const m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log

m.react()
m.react()
