"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.iosignal name="s1" />
	<hh.iosignal name="s2" valued/>
	<hh.parallel>
	  <hh.sequence>
	    ${function(){console.log("--br1--1")}}
	    <hh.emit signal="s2" dfunc=${function() {return this.present.s1}}/>
	    ${function(){console.log("--br1--2")}}
	  </hh.sequence>
	  <hh.sequence>
	    ${function(){console.log("--br2--1")}}
	    <hh.emit signal="s1"/>
	    ${function(){console.log("--br2--2")}}
	  </hh.sequence>
	</hh.parallel>
      </hh.module>

const machine = new hh.ReactiveMachine(prg);

machine.react();
