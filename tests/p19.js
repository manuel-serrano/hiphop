"use hopscript";

var hh = require("hiphop");

const prg = <hh.module O>
  <hh.emit O value=${123}/>
  <hh.loop>
    <hh.sequence>
      <hh.local S=${{initValue: 1}}>
	<hh.emit S value=${1}/>
	<hh.pause/>
	<hh.emit S apply=${function() {return this.S.preval + 1}}/>
	<hh.emit O apply=${function() {return this.S.nowval}}/>
      </hh.local>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "P19");
