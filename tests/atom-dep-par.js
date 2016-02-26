"use hopscript"

const hh = require("hiphop")

const prg =
    <hh.module>
      <hh.outputsignal name="A" combine_with=${(x, y) => x + y}/>

      <hh.parallel>
	<hh.loop>
	  <hh.emit signal_name="A" args=0 />
	  <hh.pause/>
	</hh.loop>

	<hh.loop>
	  <hh.emit signal_name="A" args=1 />
	  <hh.atom func=${x => {console.log(x)}} args=${hh.value("A")}/>
	  <hh.pause/>
	</hh.loop>

	<hh.loop>
	  <hh.emit signal_name="A" args=2 />
	  <hh.atom func=${x => {console.log(x)}} args=${hh.value("A")}/>
	  <hh.pause/>
	</hh.loop>
      </hh.parallel>

    </hh.module>;

let machine = new hh.ReactiveMachine(prg, "error2");

console.log(machine.react())
console.log(machine.react())
console.log(machine.react())
console.log(machine.react())
console.log(machine.react())
