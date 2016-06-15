"use hopscript"

const hh = require("hiphop")

const prg =
    <hh.module>
      <hh.outputsignal name="A" combine_with=${(x, y) => x + y}/>

      <hh.parallel>
	<hh.loop>
	  <hh.emit signal="A" arg=0 />
	  <hh.pause/>
	</hh.loop>

	<hh.loop>
	  <hh.emit signal="A" arg=1 />
	  <hh.atom func=${x => {console.log(x)}} arg=${hh.value("A")}/>
	  <hh.pause/>
	</hh.loop>

	<hh.loop>
	  <hh.emit signal="A" arg=2 />
	  <hh.atom func=${x => {console.log(x)}} arg=${hh.value("A")}/>
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
