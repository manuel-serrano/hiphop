"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var o1 = new rk.Signal("O1");
var o2 = new rk.Signal("O2");

var prg = <rjs.ReactiveMachine name="prepure">
    <rjs.outputsignal ref=${o1}/>
    <rjs.outputsignal ref=${o2}/>
    <rjs.loop>
    <rjs.localsignal signal_name="S">
    <rjs.sequence>
    <rjs.present test_pre signal_name="S">
    <rjs.emit signal_name="O1"/>
    <rjs.emit signal_name="O2"/>
    </rjs.present>
    <rjs.pause/>
    <rjs.emit signal_name="S"/>
    </rjs.sequence>
    </rjs.localsignal>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
