"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module O>
      <hh.loop>
	<hh.local S=${{initValue: 1}}>
	  <hh.emit S apply=${function() {return this.S.preval + 1}}/>
	  <hh.emit O apply=${function() {return this.S.nowval}}/>
	</hh.local>
	<hh.pause/>
	<hh.emit O apply=${function() {return this.O.preval}}/>
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "emitvaluedlocal1");
