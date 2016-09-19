"use hopscript"

var hh = require("hiphop");

var prg = <hh.module A B C D>
  <hh.sequence>
    <hh.emit A/>
    <hh.trap U>
      <hh.sequence>
	<hh.trap T>
	  <hh.sequence>
	    <hh.exit U/>
	    <hh.emit B/>
	  </hh.sequence>
	</hh.trap>
	<hh.emit C/>
      </hh.sequence>
    </hh.trap>
    <hh.emit D/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trapnested2");
