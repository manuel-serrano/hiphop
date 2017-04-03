"use hopscript"

const hh = require("hiphop");

function foo(cb) {
   cb(4);
}

const m = new hh.ReactiveMachine(
      <hh.module S>
	<hh.exec S apply=${function() {
	   setTimeout(this.notifyAndReact, 100, 5);
	}}/>
      </hh.module>);

console.log(m.react());

