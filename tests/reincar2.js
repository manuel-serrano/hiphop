"use hopscript"

var hh = require("hiphop");

function plus(a, b) {
   return a + b;
}

var prg =
    <hh.module>
      <hh.outputsignal name="S" valued/>
      <hh.outputsignal name="I"/>
      <hh.outputsignal name="J" valued/>
      <hh.loop>
	<hh.parallel>

	  <hh.localsignal name="M" init_value=5>
	    <hh.emit signal_name="J" args=${hh.value("M")}/>
	    <hh.pause/>
	    <hh.emit signal_name="M" args=5 />
	  </hh.localsignal>

	  <hh.localsignal name="N">
	    <hh.present signal_name="N">
	      <hh.emit signal_name="I"/>
	    </hh.present>
	    <hh.pause/>
	    <hh.emit signal_name="N"/>
	  </hh.localsignal>

	  <hh.localsignal name="L" valued>
	    <hh.emit signal_name="L" args=4 />
	    <hh.pause/>
	    <hh.emit signal_name="S" func=${plus} args=${[hh.value("L"), 5]}/>
	  </hh.localsignal>

	</hh.parallel>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "reincar2");
