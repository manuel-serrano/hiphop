"use hopscript"

const hh = require("hiphop");
const fs = require("fs");

function make_atom(i) {
   return <hh.loopeach GO>
     <hh.atom apply=${function() {console.log("branch", i)}}/>
   </hh.loopeach>;
}

function make_atom2(i) {
   return <hh.loop>
     <hh.await immediate GO/>
     <hh.atom apply=${function() {console.log("branch", i)}}/>
     <hh.pause/>
   </hh.loop>;
}

function make_atom3(i) {
   return <hh.every immediate GO>
     <hh.atom apply=${function() {console.log("branch", i)}}/>
   </hh.every>;
}

const prg =
      <hh.module>
	<hh.local GO>
	  <hh.parallel id="par">
	    <hh.loop>
	      <hh.emit GO/>
	      <hh.pause/>
	    </hh.loop>

	    ${make_atom(0)}
	    ${make_atom2(4)}
	  </hh.parallel>
	</hh.local>
      </hh.module>;

var machine = new hh.ReactiveMachine(prg, "");
machine.debug_emitted_func = console.log;

//console.log(machine.ast.pretty_print());

machine.react()
machine.react()

console.log("add 1");
machine.getElementById("par").appendChild(make_atom2(1));
machine.react()
machine.react()


console.log("add 2");
machine.getElementById("par").appendChild(make_atom(2));
//console.error(machine.ast.pretty_print());
machine.react()
//console.error(machine.ast.pretty_print());


machine.react()
machine.react()

console.log("add 3");
machine.getElementById("par").appendChild(make_atom3(3));
machine.react()
machine.react()
machine.react()

//console.log(machine.ast.pretty_print());
