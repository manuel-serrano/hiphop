"use hopscript"

var hh = require("hiphop");

function sum(arg1, arg2) {
   return arg1 + arg2;
}

var prg = <hh.module S1_and_S2 S1_and_not_S2 not_S1_and_S2 not_S1_and_not_S2>
  <hh.loop>
    <hh.trap T1>
      <hh.local S1=${{initValue: 10}}>
	<hh.parallel>
	  <hh.sequence>
	    <hh.pause/>
            <hh.emit S1 apply=${function() {return this.S1.preval}}/>
	    <hh.exit T1/>
	  </hh.sequence>
	  <hh.loop>
	    <hh.trap T2>
	      <hh.local S2=${{initValue: 20}}>
		<hh.parallel>
		  <hh.sequence>
		    <hh.pause/>
                    <hh.emit S2 apply=${function() {return this.S2.preval}}/>
		    <hh.exit T2/>
		  </hh.sequence>
		  <hh.loop>
		    <hh.sequence>
		      <hh.if S1>
			<hh.if S2>
                          <hh.emit S1_and_S2
			    apply=${function() {return sum(this.S1.nowval, this.S2.nowval)}}/>
			  <hh.emit S1_and_not_S2
			    apply=${function() {return sum(this.S1.nowval, this.S2.nowval)}}/>
			</hh.if>
			<hh.if S2>
			  <hh.emit not_S1_and_S2
			    apply=${function() {return sum(this.S1.nowval, this.S2.nowval)}}/>
			  <hh.emit not_S1_and_not_S2
			    apply=${function() {return sum(this.S1.nowval, this.S2.nowval)}}/>
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

exports.prg = new hh.ReactiveMachine(prg, "P18valued");
