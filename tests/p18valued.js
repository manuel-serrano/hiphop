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
    <hh.trap name="T1">
      <hh.let>
	<hh.signal name="S1" value=10 />
	<hh.parallel>
	  <hh.sequence>
	    <hh.pause/>
            <hh.emit signal="S1" arg=${hh.preValue("S1")}/>
	    <hh.exit trap="T1"/>
	  </hh.sequence>
	  <hh.loop>
	    <hh.trap name="T2">
	      <hh.let>
		<hh.signal name="S2" value=20 />
		<hh.parallel>
		  <hh.sequence>
		    <hh.pause/>
                    <hh.emit signal="S2" arg=${hh.preValue("S2")}/>
		    <hh.exit trap="T2"/>
		  </hh.sequence>
		  <hh.loop>
		    <hh.sequence>
		      <hh.present signal="S1">
			<hh.present signal="S2">
                          <hh.emit signal="S1_and_S2"
				    func=${sum}
				    arg0=${hh.value("S1")}
				    arg1=${hh.value("S2")}/>
			  <hh.emit signal="S1_and_not_S2"
				    func=${sum}
				    arg0=${hh.value("S1")}
				    arg1=${hh.value("S2")}/>
			</hh.present>
			<hh.present signal="S2">
			  <hh.emit signal="not_S1_and_S2"
				    func=${sum}
				    arg0=${hh.value("S1")}
				    arg1=${hh.value("S2")}/>
			  <hh.emit signal="not_S1_and_not_S2"
				    func=${sum}
				    arg0=${hh.value("S1")}
				    arg1=${hh.value("S2")}/>
			</hh.present>
		      </hh.present>
		      <hh.pause/>
		    </hh.sequence>
		  </hh.loop>
		</hh.parallel>
	      </hh.let>
	    </hh.trap>
	  </hh.loop>
	</hh.parallel>
      </hh.let>
    </hh.trap>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "P18valued");
