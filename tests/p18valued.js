"use hopscript"

var rjs = require("hiphop");

function sum(arg1, arg2) {
   return arg1 + arg2;
}

var prg = <rjs.reactivemachine debug name="P18valued">
  <rjs.outputsignal name="S1_and_S2" type="number"/>
  <rjs.outputsignal name="S1_and_not_S2" type="number"/>
  <rjs.outputsignal name="not_S1_and_S2" type="number"/>
  <rjs.outputsignal name="not_S1_and_not_S2" type="number"/>
  <rjs.loop>
    <rjs.trap trap_name="T1">
      <rjs.localsignal signal_name="S1" type="number" combine_with="+"
		       init_value=10 >
	<rjs.parallel>
	  <rjs.sequence>
	    <rjs.pause/>
            <rjs.emit signal_name="S1" exprs=${rjs.preValue("S1")}/>
	    <rjs.exit trap_name="T1"/>
	  </rjs.sequence>
	  <rjs.loop>
	    <rjs.trap trap_name="T2">
              <rjs.localsignal signal_name="S2" type="number" combine_with="+"
			       init_value=20 >
		<rjs.parallel>
		  <rjs.sequence>
		    <rjs.pause/>
                    <rjs.emit signal_name="S2" exprs=${rjs.preValue("S2")}/>
		    <rjs.exit trap_name="T2"/>
		  </rjs.sequence>
		  <rjs.loop>
		    <rjs.sequence>
		      <rjs.present signal_name="S1">
			<rjs.present signal_name="S2">
                          <rjs.emit signal_name="S1_and_S2"
				    func=${sum}
				    exprs=${[rjs.value("S1"),
					     rjs.value("S2")]}/>
			  <rjs.emit signal_name="S1_and_not_S2"
				    func=${sum}
				    exprs=${[rjs.value("S1"),
					     rjs.value("S2")]}/>
			</rjs.present>
			<rjs.present signal_name="S2">
			  <rjs.emit signal_name="not_S1_and_S2"
				    func=${sum}
				    exprs=${[rjs.value("S1"),
					     rjs.value("S2")]}/>
			  <rjs.emit signal_name="not_S1_and_not_S2"
				    func=${sum}
				    exprs=${[rjs.value("S1"),
					     rjs.value("S2")]}/>
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
