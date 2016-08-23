"use hopscript"

const hh = require("hiphop");
const fs = require("fs");

function make_atom(i) {
   return <hh.loopeach signal="GO">
     <hh.atom func=${function() {console.log("branch", i)}}/>
   </hh.loopeach>;
}

function make_atom2(i) {
   return <hh.loop>
     <hh.await immediate signal="GO"/>
     <hh.atom func=${function() {console.log("branch", i)}}/>
     <hh.pause/>
   </hh.loop>;
}

function make_atom3(i) {
   return <hh.every immediate signal="GO">
     <hh.atom func=${function() {console.log("branch", i)}}/>
   </hh.every>;
}

const prg =
      <hh.module>
	<hh.let>
	  <hh.signal name="GO"/>
	  <hh.parallel id="par">
	    <hh.loop>
	      <hh.emit signal="GO"/>
	      <hh.pause/>
	    </hh.loop>

	    ${make_atom(0)}
	    ${make_atom2(4)}
	  </hh.parallel>
	</hh.let>
      </hh.module>;

var machine = new hh.ReactiveMachine(prg, "");

//console.log(machine.ast.pretty_print());

console.log(machine.react());
console.log(machine.react());

console.log("add 1");
machine.getElementById("par").appendChild(make_atom2(1));
console.log(machine.react());
console.log(machine.react());

//machine.trace_on = 2;

console.log("add 2");
machine.getElementById("par").appendChild(make_atom(2));
//console.error(machine.ast.pretty_print());
console.log(machine.react());
//console.error(machine.ast.pretty_print());

machine.trace_on = 0;

console.log(machine.react());
console.log(machine.react());

console.log("add 3");
machine.getElementById("par").appendChild(make_atom3(3));
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());

//console.log(machine.ast.pretty_print());
