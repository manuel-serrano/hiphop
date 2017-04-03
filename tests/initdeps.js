"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module B A=${{initApply: function() {return this.value.B}}}>
        <hh.emit B value=${5}/>
	<hh.emit A/>
	<hh.pause/>
	<hh.local Y>
	  <hh.local X=${{initApply: function() {return this.value.Y}}}>
            <hh.parallel>
	      <hh.emit X/>
	      <hh.emit Y value=${55}/>
	    </hh.parallel>
	    <hh.emit A apply=${function() {return this.value.X}}/>
	  </hh.local>
	</hh.local>
      </hh.module>

const m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log

m.react()
m.react()
