"require  hopscript"

throw new Error("Dyn load of statement NYI");

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.inputsignal name="A"/>
	<hh.inputsignal name="B"/>
	<hh.inputsignal name="C"/>
	<hh.inputsignal name="R"/>
	<hh.outputsignal name="O"/>
	<hh.localsignal name="X">
	  <hh.emit signal_name="X"/>
	</hh.localsignal>
	<hh.loopeach signal_name="R">
	  <hh.parallel>
	    <hh.await signal_name="A"/>
	    <hh.await  signal_name="B"/>
	    <hh.await signal_name="C"/>
	  </hh.parallel>
	  <hh.emit id=7 signal_name="O"/>
	</hh.loopeach>
      </hh.module>;

const machine = new hh.ReactiveMachine(prg, "ABCRO-DYN-LOAD");

console.log(machine.react());
machine.setInput("A", undefined);

machine.insertSignal(<hh.outputSignal name="D"/>);

console.log(machine.react());
machine.setInput("B", undefined);
machine.setInput("C", undefined);
console.log(machine.react());

machine.insertAfter(machine.getElementById("7"),
		    <hh.localsignal name="Z">
		      <hh.emit signal_name="Z"/>
		      <hh.present signal_name="Z">
			<hh.emit signal_name="D"/>
		      </hh.present>
		    </hh.localsignal>
		   );

console.log(machine.react());
machine.setInput("R", undefined);
console.log(machine.react());
machine.setInput("B", undefined);
machine.setInput("C", undefined);
machine.setInput("A", undefined);
console.log(machine.react());

exports.prg = machine;
