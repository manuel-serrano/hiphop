"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.outputsignal name="O" combine=${(x, y) => x + y}/>
	<hh.loop>
	  <hh.parallel id="par">
	    <hh.emit signal="O" arg=1/>
	  </hh.parallel>
	  <hh.pause/>
	  <hh.pause/>
	</hh.loop>
      </hh.module>;

function add_emit(machine) {
   let branch = <hh.emit signal="O" arg=1/>;

   machine.getElementById("par").appendChild(branch);
   return branch;
}

const machine = new hh.ReactiveMachine(prg, "incr-branch");

console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
let br1 = add_emit(machine);
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
add_emit(machine);
add_emit(machine);
add_emit(machine);
console.log(machine.react());
console.log(machine.react());

machine.getElementById("par").removeChild(br1);

console.log(machine.react());
console.log(machine.react());
