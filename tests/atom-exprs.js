"use strict"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.loop>
	<hh.let L>
	  <hh.emit L value=${"foo bar"}/>
	  <hh.pause/>
	  <hh.atom apply=${function() {
	     console.log("atom works! value of L is", this.value.L);
	  }}/>
	</hh.let>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "atom");
