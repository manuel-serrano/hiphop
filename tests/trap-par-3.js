"use hopscript"

var rjs = require("hiphop")

var prg = <rjs.reactivemachine debug name="trappar3">
  <rjs.outputsignal name="S1_and_S2"/>
  <rjs.outputsignal name="S1_and_not_S2"/>
  <rjs.outputsignal name="not_S1_and_S2"/>
  <rjs.outputsignal name="not_S1_and_not_S2"/>
  <rjs.localsignal signal_name="S1">
    <rjs.localsignal signal_name="S2">
      <rjs.loop>
	<rjs.trap trap_name="T1">
	  <rjs.parallel>
	    <rjs.sequence>
	      <rjs.emit signal_name="S1"/>
	      <rjs.pause/>
	      <rjs.exit trap_name="T1"/>
	    </rjs.sequence>
	    <rjs.trap trap_name="T2">
	      <rjs.parallel>
		<rjs.sequence>
		  <rjs.emit signal_name="S2"/>
		  <rjs.pause/>
		  <rjs.exit trap_name="T2"/>
		</rjs.sequence>
		<rjs.sequence>
		  <rjs.present signal_name="S1">
		    <rjs.present signal_name="S2">
		      <rjs.emit signal_name="S1_and_S2"/>
		      <rjs.emit signal_name="S1_and_not_S2"/>
		    </rjs.present>
		    <rjs.present signal_name="S2">
		      <rjs.emit signal_name="not_S1_and_S2"/>
		      <rjs.emit signal_name="not_S1_and_not_S2"/>
		    </rjs.present>
		  </rjs.present>
		  <rjs.pause/>
		</rjs.sequence>
	      </rjs.parallel>
	    </rjs.trap>
	  </rjs.parallel>
	</rjs.trap>
      </rjs.loop>
    </rjs.localsignal>
  </rjs.localsignal>
</rjs.reactivemachine>;

exports.prg = prg;
//console.log(prg.esterel_code());
