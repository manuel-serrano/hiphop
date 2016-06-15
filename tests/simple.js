"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.outputsignal name="OK"/>
      <hh.outputsignal name="O"/>
      <hh.outputsignal name="A"/>
      <hh.outputsignal name="B"/>
      <hh.outputsignal name="C"/>
      <hh.outputsignal name="BBBB"/>
      <hh.outputsignal name="NEVER"/>
      <hh.inputsignal name="STOP"/>
      <hh.inputsignal name="AIN"/>
      <hh.abort signal="STOP">
	<hh.loop>
	  <hh.trap name="JMP">
	    <hh.emit signal="O"/>
	    <hh.trap name="FOO">
	      <hh.exit trap="JMP"/>
	      <hh.pause/>
	      <hh.pause/>
	    </hh.trap>
	  </hh.trap>
	  <hh.emit signal="O"/>
	  <hh.present signal="O">
	    <hh.emit signal="OK"/>
	  </hh.present>
	  <hh.pause/>
	  <hh.emit signal="O"/>
	  <hh.present signal="O">
	    <hh.emit signal="OK"/>
	  </hh.present>
	  <hh.pause/>
	  <hh.parallel>
	    <hh.sequence>
	      <hh.emit signal="A"/>
	      <hh.pause/>
	      <hh.emit signal="C"/>
	    </hh.sequence>
	    <hh.emit signal="B"/>
	    <hh.emit signal="BBBB"/>
	  </hh.parallel>
	</hh.loop>
      </hh.abort>
      <hh.emit signal="NEVER"/>
      <hh.pause/>
      <hh.await signal="STOP"/>
      <hh.emit signal="B"/>
      <hh.await signal="AIN"/>
      <hh.present signal="AIN">
	<hh.emit signal="C"/>
      </hh.present>
    </hh.module>;

var prg2 =
    <hh.module>
      <hh.outputsignal name="O"/>
      <hh.outputsignal name="V"/>
      <hh.loop>
	<hh.pause/>
	<hh.pause/>
	<hh.emit signal="O"/>
	<hh.pause/>
	<hh.emit signal="O"/>
	<hh.present signal="O">
	  <hh.emit signal="V"/>
	</hh.present>
      </hh.loop>
      <hh.emit signal="O"/>
    </hh.module>;

var prg3 =
    <hh.module>
      <hh.outputsignal name="O"/>
      <hh.sequence>
	<hh.nothing/>
	<hh.pause/>
	<hh.emit signal="O"/>
	<hh.nothing/>
      </hh.sequence>
      <hh.emit signal="O"/>
    </hh.module>;

var prg4 =
    <hh.module>
      <hh.outputsignal name="OK"/>
      <hh.outputsignal name="O"/>
      <hh.emit signal="O"/>
      <hh.present signal="O">
	<hh.emit signal="OK"/>
      </hh.present>
    </hh.module>;


var prg5 =
    <hh.module>
      <hh.outputsignal name="OK"/>
      <hh.outputsignal name="O"/>
      <hh.present signal="O">
	<hh.emit signal="OK"/>
      </hh.present>
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
