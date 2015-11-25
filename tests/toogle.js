"use hopscript"

var rjs = require("../lib/reactive-js.js");

var prg = <rjs.reactivemachine debug name="toogle">
  <rjs.outputsignal name="SEQ" type="number" init_value=1 combine_with="+"/>
  <rjs.outputsignal name="STATE1" type="boolean" init_value=false
		    combine_with="or"/>
  <rjs.outputsignal name="STATE2" type="boolean" init_value=false
		    combine_with="and"/>
  <rjs.outputsignal name="S"/>
  <rjs.outputsignal name="TOOGLE" type="boolean"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="SEQ"
		func=${(x, y) => x + y}
		exprs=${[rjs.preValue("SEQ"), 1]}/>
      <rjs.emit signal_name="STATE1" exprs=true />
      <rjs.emit signal_name="STATE1" exprs=false />
      <rjs.emit signal_name="STATE2" exprs=true />
      <rjs.emit signal_name="STATE2" exprs=false />
      <rjs.present test_pre signal_name="S">
	<rjs.emit signal_name="TOOGLE" exprs=true />
	<rjs.sequence>
	  <rjs.emit signal_name="TOOGLE" exprs=false />
	  <rjs.emit signal_name="S"/>
	</rjs.sequence>
      </rjs.present>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
