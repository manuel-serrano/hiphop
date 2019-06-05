"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module SAME=${{accessibility: hh.IN, initValue: 1}}>
	<hh.emit SAME value=${2}/>
	<hh.atom apply=${function() {console.log("1:", this.SAME.nowval)}}/>
	<hh.local S1=${{initValue: 5}} SAME=${{initValue: 10}}>
	  <hh.atom apply=${function() {console.log("before2:", this.SAME.nowval)}}/>
	  <hh.atom apply=${function() {console.log("before2bis:", this.SAME.nowval)}}/>
	  <hh.local SAME=${{initValue: 100}}>
	    <hh.atom apply=${function() {console.log("2:", this.SAME.nowval)}}/>
	  </hh.local>
	  <hh.atom apply=${function() {console.log("after2:", this.SAME.nowval)}}/>
	  <hh.nothing/>
	</hh.local>
	<hh.atom apply=${function() {console.log("3:", this.SAME.nowval)}}/>
      </hh.module>;


var m = new hh.ReactiveMachine(prg);

m.react();
