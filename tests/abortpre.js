"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigO = new rk.Signal("O");
var sigS = new rk.Signal("S");

var prg = <rjs.ReactiveMachine name="abortpre">
    <rjs.outputsignal ref=${sigO}/>
    <rjs.outputsignal ref=${sigS}/>
    <rjs.loop>
    <rjs.sequence>
    <rjs.abort test_pre signal_name="S">
    <rjs.sequence>
    <rjs.emit signal_name="S"/>
    <rjs.pause/>
    <rjs.emit signal_name="O"/>
    </rjs.sequence>
   </rjs.abort>
   <rjs.pause/>
   </rjs.sequence>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
