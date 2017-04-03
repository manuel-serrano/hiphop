"use hopscript"

var hh = require("hiphop")

var prg = <hh.module S1_and_S2 S1_and_not_S2 not_S1_and_S2 not_S1_and_not_S2>
  <hh.local S1 S2>
  <hh.loop>
    <hh.trap T1>
      <hh.parallel>
	<hh.sequence>
	  <hh.emit S1/>
	  <hh.pause/>
	  <hh.exit T1/>
	</hh.sequence>
	<hh.trap T2>
	  <hh.parallel>
	    <hh.sequence>
	      <hh.emit S2/>
	      <hh.pause/>
	      <hh.exit T2/>
	    </hh.sequence>
	    <hh.sequence>
	      <hh.if S1>
		<hh.if S2>
		  <hh.emit S1_and_S2/>
		  <hh.emit S1_and_not_S2/>
		</hh.if>
		<hh.if S2>
		  <hh.emit not_S1_and_S2/>
		  <hh.emit not_S1_and_not_S2/>
		</hh.if>
	      </hh.if>
	      <hh.pause/>
	    </hh.sequence>
	  </hh.parallel>
	</hh.trap>
      </hh.parallel>
    </hh.trap>
  </hh.loop>
  </hh.local>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trappar3");
