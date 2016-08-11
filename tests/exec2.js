"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.outputsignal name="O" valued/>
	<hh.exec signal="O" start=${function() {
	   setTimeout(function(self) {
	      self.returnAndReact(5);
	   }, 3000, this);
	}}/>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");

machine.addEventListener("O", function(evt) {
   console.log("O emitted!");
});

machine.react();
