"use hopscript"

import * as hh from "@hop/hiphop";

const inSig={accessibility: hh.IN};
const prg =
    <hh.module OK O A B C BBBB NEVER STOP=${inSig} AIN=${inSig}>
      <hh.abort STOP>
	<hh.loop>
	  <hh.trap JMP>
	    <hh.emit O/>
	    <hh.trap FOO>
	      <hh.exit JMP/>
	      <hh.pause/>
	      <hh.pause/>
	    </hh.trap>
	  </hh.trap>
	  <hh.emit O/>
	  <hh.if O>
	    <hh.emit OK/>
	  </hh.if>
	  <hh.pause/>
	  <hh.emit O/>
	  <hh.if O>
	    <hh.emit OK/>
	  </hh.if>
	  <hh.pause/>
	  <hh.parallel>
	    <hh.sequence>
	      <hh.emit A/>
	      <hh.pause/>
	      <hh.emit C/>
	    </hh.sequence>
	    <hh.emit B/>
	    <hh.emit BBBB/>
	  </hh.parallel>
	</hh.loop>
      </hh.abort>
      <hh.emit NEVER/>
      <hh.pause/>
      <hh.await STOP/>
      <hh.emit B/>
      <hh.await AIN/>
      <hh.if AIN>
	<hh.emit C/>
      </hh.if>
    </hh.module>;

const prg2 =
    <hh.module O V>
      <hh.loop>
	<hh.pause/>
	<hh.pause/>
	<hh.emit O/>
	<hh.pause/>
	<hh.emit O/>
	<hh.if O>
	  <hh.emit V/>
	</hh.if>
      </hh.loop>
      <hh.emit O/>
    </hh.module>;

const prg3 =
    <hh.module O>
      <hh.sequence>
	<hh.nothing/>
	<hh.pause/>
	<hh.emit O/>
	<hh.nothing/>
      </hh.sequence>
      <hh.emit O/>
    </hh.module>;

const prg4 =
    <hh.module OK O>
      <hh.emit O/>
      <hh.if O>
	<hh.emit OK/>
      </hh.if>
    </hh.module>;


const prg5 =
    <hh.module OK O>
      <hh.if O>
	<hh.emit OK/>
      </hh.if>
    </hh.module>;


const machine = new hh.ReactiveMachine(prg, "FOO");
machine.debug_emitted_func = console.log

console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react STOP");
machine.inputAndReact("STOP", undefined)
console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react");
machine.react();
console.log("will react STOP");
machine.inputAndReact("STOP", undefined)
console.log("will react");
machine.inputAndReact("AIN", undefined)
console.log("will react");
machine.react();

const m2 = new hh.ReactiveMachine(prg2, "2");
m2.debug_emitted_func = console.log
console.log("m2")
m2.react();
m2.react();
m2.react();
m2.react();
m2.react();

const m3 = new hh.ReactiveMachine(prg3, "3");
m3.debug_emitted_func = console.log
console.log("m3")
m3.react();
m3.react();
m3.react();
m3.react();
m3.react();

const m4 = new hh.ReactiveMachine(prg4, "4");
m4.debug_emitted_func = console.log
console.log("m4")
m4.react()
m4.react()
m4.react()
m4.react()
m4.react()

const m5 = new hh.ReactiveMachine(prg5, "5");
m5.debug_emitted_func = console.log
console.log("m5")
m5.react()
m5.react()
m5.react()
m5.react()
m5.react()
