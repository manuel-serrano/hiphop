"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module SAME=${{accessibility: hh.IN, initValue: 1}}>
	<hh.atom apply=${function() {console.log("1:", this.value.SAME)}}/>
	<hh.emit SAME value=${2}/>
	<hh.let S1=${{initValue: 5}} SAME=${{initValue: 8}} SAME=${{initValue: 10}}>
	  <hh.atom apply=${function() {console.log("before2:", this.value.SAME)}}/>
	  <hh.atom apply=${function() {console.log("before2bis:", this.value.SAME)}}/>
	  <hh.let SAME=${{initValue: 100}}>
	    <hh.atom apply=${function() {console.log("2:", this.value.SAME)}}/>
	  </hh.let>
	  <hh.atom apply=${function() {console.log("after2:", this.value.SAME)}}/>
	  <hh.nothing/>
	</hh.let>
	<hh.atom apply=${function() {console.log("3:", this.value.SAME)}}/>
      </hh.module>;


var m = new hh.ReactiveMachine(prg);

m.react();
