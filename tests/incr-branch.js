"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module O=${{combine: (x, y) => x + y}}>
	<hh.loop>
	  <hh.parallel id="par">
	    <hh.emit O value=${1}/>
	  </hh.parallel>
	  <hh.pause/>
	  <hh.pause/>
	</hh.loop>
      </hh.module>;

function add_emit(machine) {
   machine.getElementById("par").appendChild(<hh.emit O value=${1}/>);
}

const machine = new hh.ReactiveMachine(prg, "incr-branch");
machine.debug_emitted_func = console.log

machine.react()
machine.react()
machine.react()
machine.react()
add_emit(machine);
machine.react()
machine.react()
machine.react()
add_emit(machine);
add_emit(machine);
add_emit(machine);
machine.react()
machine.react()
