var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");
var batch = require("../batch-interpreter.js");
require("../js2esterel.js");

var S1_and_S2 = new rk.Signal("S1_and_S2", false);
var S1_and_not_S2 = new rk.Signal("S1_and_not_S2", false);
var not_S1_and_S2 = new rk.Signal("not_S1_and_S2", false);
var not_S1_and_not_S2 = new rk.Signal("not_S1_and_not_S2", false);

var prg = <rjs.reactivemachine name="P18">
  <rjs.outputsignal ref=${S1_and_S2}/>
  <rjs.outputsignal ref=${S1_and_not_S2}/>
  <rjs.outputsignal ref=${not_S1_and_S2}/>
  <rjs.outputsignal ref=${not_S1_and_not_S2}/>
  <rjs.loop>
    <rjs.trap trap_name="T1">
      <rjs.localsignal signal_name="S1">
	<rjs.parallel>
	  <rjs.sequence>
	    <rjs.pause/>
	    <rjs.emit signal_name="S1"/>
	    <rjs.exit trap_name="T1"/>
	  </rjs.sequence>
	  <rjs.loop>
	    <rjs.trap trap_name="T2">
	      <rjs.localsignal signal_name="S2">
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
