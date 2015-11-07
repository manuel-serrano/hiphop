var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");
var batch = require("../batch-interpreter.js");
require("../js2esterel.js");

var S1_and_S2 = new rk.ValuedSignal("S1_and_S2", "number");
var S1_and_not_S2 = new rk.ValuedSignal("S1_and_not_S2", "number");
var not_S1_and_S2 = new rk.ValuedSignal("not_S1_and_S2", "number");
var not_S1_and_not_S2 = new rk.ValuedSignal("not_S1_and_not_S2", "number");

var vals1 = <rjs.sigexpr get_value signal_name="S1"/>;
var vals2 = <rjs.sigexpr get_value signal_name="S2"/>;
var valpres1 = <rjs.sigexpr get_value get_pre signal_name="S1"/>;
var valpres2 = <rjs.sigexpr get_value get_pre signal_name="S2"/>;
var sums1s2 = <rjs.plusexpr expr1=${vals1} expr2=${vals2}/>;

var prg = <rjs.reactivemachine name="P18valued">
  <rjs.outputsignal ref=${S1_and_S2}/>
  <rjs.outputsignal ref=${S1_and_not_S2}/>
  <rjs.outputsignal ref=${not_S1_and_S2}/>
  <rjs.outputsignal ref=${not_S1_and_not_S2}/>
  <rjs.loop>
    <rjs.trap trap_name="T1">
      <rjs.localsignal signal_name="S1" type="number" combine_with="+" init_value=10 >
	<rjs.parallel>
	  <rjs.sequence>
	    <rjs.pause/>
            <rjs.emit signal_name="S1" expr=${valpres1}/>
	    <rjs.exit trap_name="T1"/>
	  </rjs.sequence>
	  <rjs.loop>
	    <rjs.trap trap_name="T2">
              <rjs.localsignal signal_name="S2" type="number" combine_with="+" init_value=20 >
		<rjs.parallel>
		  <rjs.sequence>
		    <rjs.pause/>
                    <rjs.emit signal_name="S2" expr=${valpres2}/>
		    <rjs.exit trap_name="T2"/>
		  </rjs.sequence>
		  <rjs.loop>
		    <rjs.sequence>
		      <rjs.present signal_name="S1">
			<rjs.present signal_name="S2">
                          <rjs.emit signal_name="S1_and_S2" expr=${sums1s2}/>
			  <rjs.emit signal_name="S1_and_not_S2" expr=${sums1s2}/>
			</rjs.present>
			<rjs.present signal_name="S2">
			  <rjs.emit signal_name="not_S1_and_S2" expr=${sums1s2}/>
			  <rjs.emit signal_name="not_S1_and_not_S2" expr=${sums1s2}/>
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
