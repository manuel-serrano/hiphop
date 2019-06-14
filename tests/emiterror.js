"use hopscript"

const hh = require("hiphop");

const prg = <hh.module O>
  <hh.loop>
    <hh.sequence>
      <hh.emit O value=5 />
      <hh.emit O value=6 />
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
