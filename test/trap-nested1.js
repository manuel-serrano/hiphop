"use hopscript"

import * as hh from "@hop/hiphop";

const prg = <hh.module A B C D>
  <hh.sequence>
    <hh.emit A/>
    <hh.trap U>
      <hh.sequence>
	<hh.trap T>
	  <hh.sequence>
	    <hh.exit T/>
	    <hh.emit B/>
	  </hh.sequence>
	</hh.trap>
	<hh.exit U/>
	<hh.emit C/>
      </hh.sequence>
    </hh.trap>
    <hh.emit D/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trapnested1");
