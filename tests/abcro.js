"require  hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="A"/>
      <hh.inputsignal name="B"/>
      <hh.inputsignal name="C"/>
      <hh.inputsignal name="R"/>
      <hh.outputsignal name="O"/>
      <hh.loopeach signal="R">
	<hh.parallel>
	  <hh.await signal="A"/>
	  <hh.await signal="B"/>
	  <hh.await signal="C"/>
	</hh.parallel>
	<hh.emit signal="O"/>
      </hh.loopeach>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "ABCRO");
