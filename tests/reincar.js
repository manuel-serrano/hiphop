"use strict"

var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");

var sigO = new reactive.Signal("O");

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
   </rjs.ReactiveMachine>;

exports.prg = prg;
