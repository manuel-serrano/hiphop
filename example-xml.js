"use hopscript"

var rjs = require("./xml-compiler.js");
var rkernel = require("./reactive-kernel.js");

var signal = new rkernel.Signal("S", false, function() {
   console.log("EMIT S");
});

var prg = <rjs.reactivemachine>
  <rjs.emit signal=${signal} />
</rjs.reactivemachine>;

prg.react();
