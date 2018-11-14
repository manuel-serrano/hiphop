"use hopscript"

const hh = require("hiphop");

function foo(cb) {
   cb(4);
}

const m = new hh.ReactiveMachine(
      <hh.module S>
	<hh.exec S apply=${function() {
	   		      setTimeout(this.notify.bind( this ), 100, 5);
	}}/>
      </hh.module>);

m.debug_emitted_func = console.log
m.react()

