"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module I O=${{initValue: 5}} U>
      <hh.loop>
	<hh.emit I value=${3} />
	<hh.emit O apply=${function() {return this.value.I}}/>
	<hh.emit U apply=${function() {return this.preValue.O}}/>
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "valuepre1");
