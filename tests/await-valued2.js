"use hopscript"

var hh = require("hiphop");

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

function foo(evt) {
   console.log("foo called by", evt.signalName, "with value", evt.signalValue);
}

function foo2(evt) {
   console.log("foo2 called by", evt.signalName, "with value", evt.signalValue);
}

function foo3(evt) {
   console.log("foo3 called by", evt.signalName, "with value", evt.signalValue);
}


var prg = <hh.module I=${inSig} O=${outSig}>
  <hh.loop>
    <hh.sequence>
      <hh.await I />
      <hh.emit O apply=${function() {return this.value.I}} />
    </hh.sequence>
  </hh.loop>
</hh.module>;

var m = new hh.ReactiveMachine(prg, "awaitvalued2");

m.addEventListener("O", foo);

console.log(";")
console.log(m.react());

m.addEventListener("O", foo2);

console.log("I(34)")
console.log(m.inputAndReact("I", 34));

m.addEventListener("O", foo3);

console.log("I");
console.log(m.inputAndReact("I"));

m.removeEventListener("O", foo3);

console.log("I(15)");
console.log(m.inputAndReact("I", 15));
