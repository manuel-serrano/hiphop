var rjs = require("../xml-compiler.js");

var prg = <rjs.reactivemachine name="nothingpar">
  <rjs.parallel>
    <rjs.sequence>
      <rjs.nothing/>
      <rjs.pause/>
    </rjs.sequence>
    <rjs.nothing/>
  </rjs.parallel>
</rjs.reactivemachine>;

exports.prg = prg;
