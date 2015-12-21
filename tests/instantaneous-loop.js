"use strict"

var rjs = require("hiphop");

var prg = <rjs.ReactiveMachine debug name="instloop">
  <rjs.outputsignal name="O" type="string"/>
  <rjs.loop>
    <rjs.localsignal name="L" type="string">
      <rjs.emit signal_name="L" exprs=${"foo bar"}/>
      <rjs.emit signal_name="O" exprs=${rjs.value("L")}/>
    </rjs.localsignal>
  </rjs.loop>
</rjs.ReactiveMachine>;

try {
   prg.react();
   prg.react();
   prg.react();
   prg.react();
} catch (e) {
   console.log(e.message)
}
