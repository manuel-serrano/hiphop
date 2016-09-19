"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module B A=${{initApply: function() {return this.value.B}}}>
        <hh.emit B value=${5}/>
	<hh.emit A/>
	<hh.pause/>
	<hh.let Y>
	  <hh.let X=${{initApply: function() {return this.value.Y}}}>
            <hh.parallel>
	      <hh.emit X/>
	      <hh.emit Y value=${55}/>
	    </hh.parallel>
	    <hh.emit A apply=${function() {return this.value.X}}/>
	  </hh.let>
	</hh.let>
      </hh.module>

const m = new hh.ReactiveMachine(prg);

console.log(m.react());
console.log(m.react());
