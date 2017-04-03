"use hopscript"

var hh = require("hiphop");

var prg = <hh.module S1_and_S2 S1_and_not_S2 not_S1_and_S2 not_S1_and_not_S2>
  <hh.loop>
    <hh.trap T1>
      <hh.local S1>
	<hh.parallel>
	  <hh.sequence>
	    <hh.pause/>
	    <hh.emit S1/>
	    <hh.exit T1/>
	  </hh.sequence>
	  <hh.loop>
	    <hh.trap T2>
	      <hh.local S2>
		<hh.parallel>
		  <hh.sequence>
		    <hh.pause/>
		    <hh.emit S2/>
		    <hh.exit T2/>
		  </hh.sequence>
		  <hh.loop>
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
		  </hh.loop>
		</hh.parallel>
	      </hh.local>
	    </hh.trap>
	  </hh.loop>
	</hh.parallel>
      </hh.local>
    </hh.trap>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "P18");
