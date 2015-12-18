"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="P18">
  <rjs.outputsignal name="S1_and_S2"/>
  <rjs.outputsignal name="S1_and_not_S2"/>
  <rjs.outputsignal name="not_S1_and_S2"/>
  <rjs.outputsignal name="not_S1_and_not_S2"/>
  <rjs.loop>
    <rjs.trap trap_name="T1">
      <rjs.localsignal name="S1">
	<rjs.parallel>
	  <rjs.sequence>
	    <rjs.pause/>
	    <rjs.emit signal_name="S1"/>
	    <rjs.exit trap_name="T1"/>
	  </rjs.sequence>
	  <rjs.loop>
	    <rjs.trap trap_name="T2">
	      <rjs.localsignal name="S2">
		<rjs.parallel>
		  <rjs.sequence>
		    <rjs.pause/>
		    <rjs.emit signal_name="S2"/>
		    <rjs.exit trap_name="T2"/>
		  </rjs.sequence>
		  <rjs.loop>
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
		  </rjs.loop>
		</rjs.parallel>
	      </rjs.localsignal>
	    </rjs.trap>
	  </rjs.loop>
	</rjs.parallel>
      </rjs.localsignal>
    </rjs.trap>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
