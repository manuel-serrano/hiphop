"use hopscript"

const hh = require("hiphop");

function foo(cb) {
   cb(4);
}

const m = new hh.ReactiveMachine(
      <hh.module>
	<hh.iosignal name="S" valued/>
	<hh.exec signal="S" start=${function() {
	   setTimeout(this.returnAndReact, 100, 5);
	}}/>
      </hh.module>);

console.log(m.react());

