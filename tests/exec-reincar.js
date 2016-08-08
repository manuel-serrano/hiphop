"use hopscript"

const hh = require("hiphop");

var glob = 5;

const prg =
      <hh.module>
	<hh.inputsignal name="R"/>
	<hh.outputsignal name="O"/>
	<hh.outputsignal name="OT" valued/>
	<hh.inputsignal name="T" valued/>
	<hh.loopeach signal="R">
	  <hh.parallel>
	    <hh.abort signal="R">
	      <hh.exec signal="T" start=${function() {
		 console.log("Oi.");
		 setTimeout(function(self) {
		    console.log("Oi timeout.");
		    self.return(glob++);
		 }, 1000, this);
	      }}/>
	      <hh.emit signal="OT" value=${function(){return this.value.T}}/>
	    </hh.abort>
	    <hh.emit signal="O"/>
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

