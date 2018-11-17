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
		    self.notify(glob++, false);
		 }, 1000, this);
	      }}/>
	      <hh.emit OT apply=${function(){return this.T.nowval}}/>
	    </hh.abort>
	    <hh.emit O/>
	  </hh.parallel>
	</hh.loopeach>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");
machine.debug_emitted_func = console.log

machine.react()

setTimeout(function() {
   machine.inputAndReact("R")
}, 500);

setTimeout(function() {
   machine.react()
}, 1100);

setTimeout(function() {
   machine.react()
}, 2000);

