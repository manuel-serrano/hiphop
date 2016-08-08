"use strict"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.loop>
	<hh.let>
	  <hh.signal name="L" valued/>
	  <hh.emit signal="L" arg=${"foo bar"}/>
	  <hh.pause/>
	  ${function() {
	     console.log("atom works! value of L is", this.value.L);
	  }}
	</hh.let>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "atom");
