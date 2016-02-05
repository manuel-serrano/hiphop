"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
    <hh.outputsignal name="O"/>
    <hh.outputsignal name="S"/>
    <hh.loop>
    <hh.sequence>
    <hh.abort test_pre signal_name="S">
    <hh.sequence>
    <hh.emit signal_name="S"/>
    <hh.pause/>
    <hh.emit signal_name="O"/>
    </hh.sequence>
   </hh.abort>
   <hh.pause/>
   </hh.sequence>
   </hh.loop>
   </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "abortpre");
