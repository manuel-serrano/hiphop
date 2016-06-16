"use hopscript"

var hh = require("hiphop")

var prg = <hh.module>
  <hh.outputsignal name="S1_and_S2"/>
  <hh.outputsignal name="S1_and_not_S2"/>
  <hh.outputsignal name="not_S1_and_S2"/>
  <hh.outputsignal name="not_S1_and_not_S2"/>
  <hh.let>
  <hh.signal name="S1"/>
  <hh.signal name="S2"/>
  <hh.loop>
    <hh.trap name="T1">
      <hh.parallel>
	<hh.sequence>
	  <hh.emit signal="S1"/>
	  <hh.pause/>
	  <hh.exit trap="T1"/>
	</hh.sequence>
	<hh.trap name="T2">
	  <hh.parallel>
	    <hh.sequence>
	      <hh.emit signal="S2"/>
	      <hh.pause/>
	      <hh.exit trap="T2"/>
	    </hh.sequence>
	    <hh.sequence>
	      <hh.present signal="S1">
		<hh.present signal="S2">
		  <hh.emit signal="S1_and_S2"/>
		  <hh.emit signal="S1_and_not_S2"/>
		</hh.present>
		<hh.present signal="S2">
		  <hh.emit signal="not_S1_and_S2"/>
		  <hh.emit signal="not_S1_and_not_S2"/>
		</hh.present>
	      </hh.present>
	      <hh.pause/>
	    </hh.sequence>
	  </hh.parallel>
	</hh.trap>
      </hh.parallel>
    </hh.trap>
  </hh.loop>
  </hh.let>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trappar3");
