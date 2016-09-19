"use hopscript"

var hh = require("hiphop");

var inSig={accessibility: hh.IN};
var prg =
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

var prg2 =
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

var prg3 =
    <hh.module O>
      <hh.sequence>
	<hh.nothing/>
	<hh.pause/>
	<hh.emit O/>
	<hh.nothing/>
      </hh.sequence>
      <hh.emit O/>
    </hh.module>;

var prg4 =
    <hh.module OK O>
      <hh.emit O/>
      <hh.if O>
	<hh.emit OK/>
      </hh.if>
    </hh.module>;


var prg5 =
    <hh.module OK O>
      <hh.if O>
	<hh.emit OK/>
      </hh.if>
    </hh.module>;


var machine = new hh.ReactiveMachine(prg, "FOO");

console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react STOP");
console.log(machine.inputAndReact("STOP", undefined))
console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react");
console.log(machine.react());
console.log("will react STOP");
console.log(machine.inputAndReact("STOP", undefined))
console.log("will react");
console.log(machine.inputAndReact("AIN", undefined));
console.log("will react");
console.log(machine.react());

var m2 = new hh.ReactiveMachine(prg2, "2");
console.log("m2")
console.log(m2.react());
console.log(m2.react());
console.log(m2.react());
console.log(m2.react());
console.log(m2.react());

var m3 = new hh.ReactiveMachine(prg3, "3");
console.log("m3")
console.log(m3.react());
console.log(m3.react());
console.log(m3.react());
console.log(m3.react());
console.log(m3.react());

var m4 = new hh.ReactiveMachine(prg4, "4");
console.log("m4")
console.log(m4.react());
console.log(m4.react());
console.log(m4.react());
console.log(m4.react());
console.log(m4.react());

var m5 = new hh.ReactiveMachine(prg5, "5");
console.log("m5")
console.log(m5.react());
console.log(m5.react());
console.log(m5.react());
console.log(m5.react());
console.log(m5.react());
