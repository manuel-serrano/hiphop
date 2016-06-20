"use hopscript"

function plus (x, y) { return x+y };

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.inputsignal name="R"/>
      <hh.outputsignal name="O" value=0 />
      <hh.loop>
	<hh.abort signal="R">
          <hh.sequence>
            <hh.await signal="I"/>
            <hh.emit signal="O"
                     func=${plus}
                     arg0=${hh.preValue("O")}
		     arg1=1/>
            <hh.pause/>
          </hh.sequence>
	</hh.abort>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "Incr");
