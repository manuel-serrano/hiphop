"use hopscript"

var hh = require("hiphop");

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

function foo(evt) {
   console.log("foo called by", evt.type, "with value", evt.nowval);
}

function foo2(evt) {
   console.log("foo2 called by", evt.type, "with value", evt.nowval);
}

function foo3(evt) {
   console.log("foo3 called by", evt.type, "with value", evt.nowval);
}


var prg = <hh.module I=${inSig} O=${outSig}>
  <hh.loop>
    <hh.sequence>
      <hh.await I />
      <hh.emit O apply=${function() {return this.I.nowval}} />
    </hh.sequence>
  </hh.loop>
</hh.module>;

var m = new hh.ReactiveMachine(prg, "awaitvalued2");
m.debug_emitted_func = console.log;

m.addEventListener("O", foo);

console.log(";")
m.react();

m.addEventListener("O", foo2);

console.log("I(34)")
m.inputAndReact("I", 34);

m.addEventListener("O", foo3);

console.log("I(34)");
m.inputAndReact("I", 34);

m.removeEventListener("O", foo3);

console.log("I(15)");
m.inputAndReact("I", 15);
