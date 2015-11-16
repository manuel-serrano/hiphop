"use hopstrict"

var rjs = require("../lib/reactive-js.js");

var sigO = new rjs.Signal("O");

var prg = <rjs.reactivemachine name="reincar">
  <rjs.outputsignal ref=${sigO}/>
  <rjs.loop>
    <rjs.localsignal signal_name="S">
      <rjs.sequence>
	<rjs.present signal_name="S">
	  <rjs.emit signal_name="O"/>
	</rjs.present>
	<rjs.pause/>
	<rjs.emit signal_name="S"/>
      </rjs.sequence>
    </rjs.localsignal>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
