"use hopscropt"

const hh = require("hiphop");

const prg =
      <hh.module A B>
	<hh.emit A B/>
      </hh.module>

const m = new hh.ReactiveMachine(prg);

console.log(m.react());
console.log(m.react());
