"use hopscript"

var rjs = require("../lib/reactive-js.js");

var pre_seq = <rjs.sigexpr get_value get_pre signal_name="SEQ"/>;
var expr1 = <rjs.expr func=${function(arg1, arg2) { return arg1 + arg2 }}
		      exprs=${[pre_seq, 1]}/>;

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
