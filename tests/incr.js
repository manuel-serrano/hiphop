"use hopscript"

function plus (x, y) { return x+y };

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.inputsignal name="R"/>
      <hh.outputsignal name="O" init_value=0 />
      <hh.loop>
	<hh.abort signal_name="R">
          <hh.sequence>
            <hh.await signal_name="I"/>
            <hh.emit signal_name="O"
                     func=${plus}
                     args=${[hh.preValue("O"), 1]}/>
            <hh.pause/>
          </hh.sequence>
	</hh.abort>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "Incr");
