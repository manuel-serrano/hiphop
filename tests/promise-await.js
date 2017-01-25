"use hopscript"

const hh = require("hiphop");
const tl = hh.timelib;

const m = new hh.ReactiveMachine(
   <hh.module I O>
     <hh.await immediate I/>
     <tl.timeout value=1000/>
     <hh.emit O apply=${function() { return this.value.I }}/>
   </hh.module>
);

async function foo() {
   m.value.I = 45;
   console.log("I emitted...");
   let o  = await m.promise.O;
   console.log("O(" + o + ") emitted...");
}

foo();
