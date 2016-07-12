"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.inputsignal name="SAME" value=1/>
	<hh.atom arg=${hh.value("SAME")} func=${x => console.log("1:", x)}/>
	<hh.emit signal="SAME" arg=2/>
	<hh.let>
	  <hh.signal name="S1" value=5/>
	  <hh.signal name="SAME" value=8/>
	  <hh.signal name="SAME" value=10/>
	  <hh.atom arg=${hh.value("SAME")} func=${x => console.log("before2:", x)}/>
	  <hh.atom arg=${hh.value("SAME")} func=${x => console.log("before2bis:", x)}/>
	  <hh.let>
	    <hh.signal name="SAME" value=100/>
	    <hh.atom arg=${hh.value("SAME")} func=${x => console.log("2:", x)}/>
	  </hh.let>
	  <hh.atom arg=${hh.value("SAME")} func=${x => console.log("after2:", x)}/>
	  <hh.nothing/>
	</hh.let>
	<hh.atom arg=${hh.value("SAME")} func=${x => console.log("3:", x)}/>
      </hh.module>;


var m = new hh.ReactiveMachine(prg);

console.log(m.ast.pretty_print());
m.react();
