"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var seq = new rk.ValuedSignal("SEQ", "number", "+", 1);
var state1 = new rk.ValuedSignal("STATE1", "boolean", "or", false);
var state2 = new rk.ValuedSignal("STATE2", "boolean", "and", false);
var s = new rk.Signal("S");
var toogle = new rk.ValuedSignal("TOOGLE", "boolean");

var const1 = <rjs.constexpr value=1 />;
var consttrue = <rjs.constexpr value=true />;
var constfalse = <rjs.constexpr value=false />;
var preseq = <rjs.sigexpr get_value get_pre signal_name="SEQ"/>;
var expr1 = <rjs.plusexpr expr1=${preseq} expr2=${const1}/>;

var prg = <rjs.reactivemachine name="toogle">
    <rjs.outputsignal ref=${seq}/>
    <rjs.outputsignal ref=${state1}/>
    <rjs.outputsignal ref=${state2}/>
    <rjs.outputsignal ref=${s}/>
    <rjs.outputsignal ref=${toogle}/>
    <rjs.loop>
    <rjs.sequence>
    <rjs.emit signal_name="SEQ" expr=${expr1}/>
    <rjs.emit signal_name="STATE1" expr=${consttrue}/>
    <rjs.emit signal_name="STATE1" expr=${constfalse}/>
    <rjs.emit signal_name="STATE2" expr=${consttrue}/>
    <rjs.emit signal_name="STATE2" expr=${constfalse}/>
    <rjs.present test_pre signal_name="S">
    <rjs.emit signal_name="TOOGLE" expr=${consttrue}/>
    <rjs.sequence>
    <rjs.emit signal_name="TOOGLE" expr=${constfalse}/>
    <rjs.emit signal_name="S"/>
    </rjs.sequence>
   </rjs.present>
   <rjs.pause/>
   </rjs.sequence>
   </rjs.loop>
   </rjs.reactivemachine>;

exports.prg = prg;
