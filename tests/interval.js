"use hopscript"

const hh = require("hiphop");
const tl = hh.timelib;

const prg =
      <hh.module>
	<tl.interval value=${100} countApply=${() => 3}>
	  <hh.atom apply=${() => console.log("-----------")}/>
	  <tl.interval value=${10} countValue=${5}>
	    <hh.atom apply=${() => console.log(".")}/>
	  </tl.interval>
	</tl.interval>
	<hh.atom apply=${() => console.log("-----------")}/>
      </hh.module>;

const m = new hh.ReactiveMachine(prg);

m.react();

