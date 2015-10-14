var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");
var inspector = require("../inspector.js");

var sigI = new reactive.Signal("I", false);
sigI.local = true;
var sigJ = new reactive.Signal("J", false);

var machine = <rjs.reactivemachine name="parallel">
  <rjs.parallel>
    <rjs.emit signal=${sigI}/>
    <rjs.sequence>
      <rjs.await signal=${sigI}/>
      <rjs.emit signal=${sigJ}/>
    </rjs.sequence>
  </rjs.parallel>
</rjs.reactivemachine>;

exports.prg = machine;
