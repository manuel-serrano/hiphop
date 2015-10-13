"use hopscript"

var rjs = require("../xml-compiler.js");
var rkernel = require("../reactive-kernel.js");
var inspector = require("../inspector.js");

var sigI = new rkernel.Signal("I", false);
var sigJ = new rkernel.Signal("J", false);
var sigK = new rkernel.Signal("K", false);
var sigV = new rkernel.Signal("V", false);

var prg = <rjs.reactivemachine name="abortpresent">
  <rjs.loop>
    <rjs.sequence>
      <rjs.abort signal=${sigI}>
	<rjs.sequence>
	  <rjs.emit signal=${sigJ}/>
	  <rjs.pause/>
	  <rjs.emit signal=${sigV}/>
	  <rjs.pause/>
	</rjs.sequence>
      </rjs.abort>
      <rjs.present signal=${sigI}>
	<rjs.emit signal=${sigK}/>
      </rjs.present>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>

exports.prg = prg;
