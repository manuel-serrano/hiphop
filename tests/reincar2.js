"use hopscript"

var hh = require("hiphop");

function plus(a, b) {
   return a + b;
}

var prg =
    <hh.module>
      <hh.outputsignal name="S" type="number"/>
      <hh.outputsignal name="I"/>
      <hh.outputsignal name="J" type="number"/>
      <hh.loop>
	<hh.parallel>

	  <hh.localsignal name="M"
			  init_value=5
			  type="number">
	    <hh.emit signal_name="J" exprs=${hh.value("M")}/>
	    <hh.pause/>
	    <hh.emit signal_name="M" exprs=5 />
	  </hh.localsignal>

	  <hh.localsignal name="N">
	    <hh.present signal_name="N">
	      <hh.emit signal_name="I"/>
	    </hh.present>
	    <hh.pause/>
	    <hh.emit signal_name="N"/>
	  </hh.localsignal>

	  <hh.localsignal name="L" type="number">
	    <hh.emit signal_name="L" exprs=4 />
	    <hh.pause/>
	    <hh.emit signal_name="S" func=${plus} exprs=${[hh.value("L"), 5]}/>
	  </hh.localsignal>

	</hh.parallel>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "reincar2");
