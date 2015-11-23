"use hopscript"

var rjs = require("reactive-js");

var prg = <rjs.ReactiveMachine debug name="valuepre1">
  <rjs.outputsignal name="I" type="number"/>
  <rjs.outputsignal name="O" type="number" init_value=5 combine_with="+"/>
  <rjs.outputsignal name="U" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="I" expr=3 />
      <rjs.emit signal_name="O"
		expr=${<rjs.sigexpr get_value signal_name="I"/>}/>
      <rjs.emit signal_name="U"
		expr=${<rjs.sigexpr get_value get_pre signal_name="O"/>}/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
