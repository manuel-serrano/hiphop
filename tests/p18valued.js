"use hopscript"

var hh = require("hiphop");

function sum(arg1, arg2) {
   return arg1 + arg2;
}

var prg = <hh.module>
  <hh.outputsignal name="S1_and_S2" valued/>
  <hh.outputsignal name="S1_and_not_S2" valued/>
  <hh.outputsignal name="not_S1_and_S2" valued/>
  <hh.outputsignal name="not_S1_and_not_S2" valued/>
  <hh.loop>
    <hh.trap trap_name="T1">
      <hh.localsignal name="S1" init_value=10 >
	<hh.parallel>
	  <hh.sequence>
	    <hh.pause/>
            <hh.emit signal_name="S1" args=${hh.preValue("S1")}/>
	    <hh.exit trap_name="T1"/>
	  </hh.sequence>
	  <hh.loop>
	    <hh.trap trap_name="T2">
              <hh.localsignal name="S2" init_value=20 >
		<hh.parallel>
		  <hh.sequence>
		    <hh.pause/>
                    <hh.emit signal_name="S2" args=${hh.preValue("S2")}/>
		    <hh.exit trap_name="T2"/>
		  </hh.sequence>
		  <hh.loop>
		    <hh.sequence>
		      <hh.present signal_name="S1">
			<hh.present signal_name="S2">
                          <hh.emit signal_name="S1_and_S2"
				    func=${sum}
				    args=${[hh.value("S1"),
					    hh.value("S2")]}/>
			  <hh.emit signal_name="S1_and_not_S2"
				    func=${sum}
				    args=${[hh.value("S1"),
					    hh.value("S2")]}/>
			</hh.present>
			<hh.present signal_name="S2">
			  <hh.emit signal_name="not_S1_and_S2"
				    func=${sum}
				    args=${[hh.value("S1"),
					    hh.value("S2")]}/>
			  <hh.emit signal_name="not_S1_and_not_S2"
				    func=${sum}
				    args=${[hh.value("S1"),
					    hh.value("S2")]}/>
			</hh.present>
		      </hh.present>
		      <hh.pause/>
		    </hh.sequence>
		  </hh.loop>
		</hh.parallel>
	      </hh.localsignal>
	    </hh.trap>
	  </hh.loop>
	</hh.parallel>
      </hh.localsignal>
    </hh.trap>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "P18valued");
