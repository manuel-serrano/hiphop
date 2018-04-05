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
   let branch = <hh.emit O value=${1}/>;

   machine.getElementById("par").appendChild(branch);
   return branch;
}

const machine = new hh.ReactiveMachine(prg, "incr-branch");
machine.debuggerOn("debug");

function sleep(ms) {
   return new Promise(function(resolve, reject) {
      setTimeout(resolve, ms);
   });
}

let sleepTime = 2000;

(async function() {
   await sleep(sleepTime);
   console.log(machine.react());
   await sleep(sleepTime);
   console.log(machine.react());
   await sleep(sleepTime);
   console.log(machine.react());
   await sleep(sleepTime);
   console.log(machine.react());
   await sleep(sleepTime);
   console.log("-------------------- +BR1");
   let br1 = add_emit(machine);
   console.log(machine.react());
   await sleep(sleepTime);
   console.log(machine.react());
   await sleep(sleepTime);
   console.log(machine.react());
   console.log("-------------------- +BR");
   add_emit(machine);
   console.log("-------------------- +BR");
   add_emit(machine);
   console.log("-------------------- +BR");
   add_emit(machine);
   await sleep(sleepTime);
   console.log(machine.react());
   await sleep(sleepTime);
   console.log(machine.react());

   console.log("-------------------- -BR1");
   machine.getElementById("par").removeChild(br1);
   await sleep(sleepTime);
   console.log(machine.react());
   await sleep(sleepTime);
   console.log(machine.react());
})();
