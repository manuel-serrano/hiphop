"use hopscript"

var rjs = require("../lib/reactive-js.js");

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
