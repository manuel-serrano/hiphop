"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.ReactiveMachine debug name="abortpre">
    <rjs.outputsignal name="O"/>
    <rjs.outputsignal name="S"/>
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
