"use hopscript"

var hh = require("hiphop");

function plus(a, b) {
   return a + b;
}

var prg =
    <hh.module S I J>
      <hh.loop>
	<hh.parallel>

	  <hh.let M=${{initValue: 5}}>
	    <hh.emit J apply=${function(){return this.value.M}}/>
	    <hh.pause/>
	    <hh.emit M value=${5} />
	  </hh.let>

	  <hh.let N>
	    <hh.if N>
	      <hh.emit I/>
	    </hh.if>
	    <hh.pause/>
	    <hh.emit N/>
	  </hh.let>

	  <hh.let L>
	    <hh.emit L value=${4} />
	    <hh.pause/>
	    <hh.emit S apply=${function() {return plus(this.value.L, 5)}}/>
	  </hh.let>

	</hh.parallel>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "reincar2");
