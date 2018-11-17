"use hopscript"

var hh = require("hiphop");

function plus(a, b) {
   return a + b;
}

var prg =
    <hh.module S I J>
      <hh.loop>
	<hh.parallel>

	  <hh.local M=${{initValue: 5}}>
	    <hh.emit J apply=${function() {return this.M.nowval}}/>
	    <hh.pause/>
	    <hh.emit M  value=${5} />
	  </hh.local>

	  <hh.local N>
	    <hh.if N>
	      <hh.emit I/>
	    </hh.if>
	    <hh.pause/>
	    <hh.emit N/>
	  </hh.local>

	  <hh.local L>
	    <hh.emit L value=${4} />
	    <hh.pause/>
	    <hh.emit S apply=${function() {return plus(this.L.nowval, 5)}}/>
	  </hh.local>

	</hh.parallel>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "reincar2");
