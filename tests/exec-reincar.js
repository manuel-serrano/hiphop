"use hopscript"

const hh = require("hiphop");

var glob = 5;

const prg =
      <hh.module R=${{accessibility: hh.IN}} O OT T=${{accessibility: hh.IN}}>
	<hh.loopeach R>
	  <hh.parallel>
	    <hh.abort R>
	      <hh.exec T apply=${function() {
		 console.log("Oi.");
		 setTimeout(function(self) {
		    console.log("Oi timeout.");
		    self.notify(glob++);
		 }, 1000, this);
	      }}/>
	      <hh.emit OT apply=${function(){return this.value.T}}/>
	    </hh.abort>
	    <hh.emit O/>
	  </hh.parallel>
	</hh.loopeach>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");

console.log(machine.react());

setTimeout(function() {
   console.log(machine.inputAndReact("R"));
}, 500);

setTimeout(function() {
   console.log(machine.react());
}, 1100);

setTimeout(function() {
   console.log(machine.react());
}, 2000);

