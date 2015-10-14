"use strict"

var reactive = require("../reactive-kernel.js");
var inspector = require("../inspector.js");
var rjs = require("../xml-compiler.js");

var sigS = new reactive.Signal("S", false);
sigS.local = true;
var sigT = new reactive.Signal("T", false);
var sigV = new reactive.Signal("V", false);

var prg = <rjs.reactivemachine name="example2">
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal=${sigS}/>
      <rjs.present signal=${sigS}>
	<rjs.emit signal=${sigT}/>
      </rjs.present>
      <rjs.pause/>
      <rjs.emit signal=${sigV}/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>

exports.prg = prg;
