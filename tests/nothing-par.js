"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="nothingpar">
  <rjs.parallel>
    <rjs.sequence>
      <rjs.nothing/>
      <rjs.pause/>
    </rjs.sequence>
    <rjs.nothing/>
  </rjs.parallel>
</rjs.reactivemachine>;

exports.prg = prg;
