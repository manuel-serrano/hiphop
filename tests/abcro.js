"require  hopscript"

var hh = require("hiphop");

var machine =
    <hh.reactivemachine debug name="ABCRO">
      <hh.inputsignal name="A"/>
      <hh.inputsignal name="B"/>
      <hh.inputsignal name="C"/>
      <hh.inputsignal name="R"/>
      <hh.outputsignal name="O"/>
      <hh.loopeach signal_name="R">
	<hh.parallel>
	  <hh.await signal_name="A"/>
	  <hh.await signal_name="B"/>
	  <hh.await signal_name="C"/>
	</hh.parallel>
	<hh.emit signal_name="O"/>
      </hh.loopeach>
    </hh.reactivemachine>;

exports.prg = machine;
