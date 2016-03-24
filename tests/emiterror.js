"use hopscript"

const hh = require("hiphop");

const prg = <hh.module>
  <hh.outputsignal name="O" valued/>
  <hh.loop>
    <hh.sequence>
      <hh.emit signal_name="O" arg=5 />
      <hh.emit signal_name="O" arg=5 />
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

const machine = new hh.ReactiveMachine(prg, "emiterror");

try {
   machine.react();
} catch (e) {
   console.log(e.message);
}
