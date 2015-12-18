"use hopstrict"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="reincar">
  <rjs.outputsignal name="O"/>
  <rjs.loop>
    <rjs.localsignal name="S">
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
