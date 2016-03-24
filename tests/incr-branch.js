"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.outputsignal name="O" combine_with=${(x, y) => x + y}/>
	<hh.loop>
	  <hh.parallel id="par">
	    <hh.emit signal_name="O" arg=1/>
	  </hh.parallel>
	  <hh.pause/>
	  <hh.pause/>
	</hh.loop>
      </hh.module>;

function add_emit(machine) {
   machine.getElementById("par").appendChild(<hh.emit signal_name="O" arg=1/>);
}

const machine = new hh.ReactiveMachine(prg, "incr-branch");

console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
add_emit(machine);
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
add_emit(machine);
add_emit(machine);
add_emit(machine);
console.log(machine.react());
console.log(machine.react());
