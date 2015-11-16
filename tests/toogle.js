"use hopscript"

var rjs = require("../lib/reactive-js.js");

var seq = new rjs.ValuedSignal("SEQ", "number", 1, "+");
var state1 = new rjs.ValuedSignal("STATE1", "boolean", false, "or");
var state2 = new rjs.ValuedSignal("STATE2", "boolean", false, "and");
var s = new rjs.Signal("S");
var toogle = new rjs.ValuedSignal("TOOGLE", "boolean", undefined, undefined);

var pre_seq = <rjs.sigexpr get_value get_pre signal_name="SEQ"/>;
var expr1 = <rjs.expr func=${function(arg1, arg2) { return arg1 + arg2 }}
		      exprs=${[pre_seq, 1]}/>;

var prg = <rjs.reactivemachine debug name="toogle">
  <rjs.outputsignal ref=${seq}/>
  <rjs.outputsignal ref=${state1}/>
  <rjs.outputsignal ref=${state2}/>
  <rjs.outputsignal ref=${s}/>
  <rjs.outputsignal ref=${toogle}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="SEQ" expr=${expr1}/>
      <rjs.emit signal_name="STATE1" expr=true />
      <rjs.emit signal_name="STATE1" expr=false />
      <rjs.emit signal_name="STATE2" expr=true />
      <rjs.emit signal_name="STATE2" expr=false />
      <rjs.present test_pre signal_name="S">
	<rjs.emit signal_name="TOOGLE" expr=true />
	<rjs.sequence>
	  <rjs.emit signal_name="TOOGLE" expr=false />
	  <rjs.emit signal_name="S"/>
	</rjs.sequence>
      </rjs.present>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
