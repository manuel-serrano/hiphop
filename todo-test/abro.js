"use hopscript"

var rjs = require("../xml-compiler.js");
var rkernel = require("../reactive-kernel.js");
var inspector = require("../inspector.js");

var sigA = new rkernel.Signal("A", false, null);
var sigB = new rkernel.Signal("B", false, null);
var sigR = new rkernel.Signal("R", false, null);
var sigO = new rkernel.Signal("O", false, function() {
   console.log("EMIT O");
});

var prg = <rjs.reactivemachine>
    <rjs.loop>
        <rjs.abort signal=${sigR}>
            <rjs.sequence>
                <rjs.parallel>
                    <rjs.await signal=${sigA} />
                    <rjs.await signal=${sigB} />
                </rjs.parallel>
                <rjs.emit signal=${sigO} />
		<rjs.halt/>
            </rjs.sequence>
        </rjs.abort>
    </rjs.loop>
</rjs.reactivemachine>;

prg.react();

console.log("A B");
sigA.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();

console.log("A B");
sigA.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();

console.log("R");
sigR.set_from_host(true, null);
prg.react();

console.log("A B");
sigA.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();

console.log("R A B");
sigA.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();

console.log("R");
sigR.set_from_host(true, null);
prg.react();

// (new inspector.Inspector(prg)).inspect();

console.log("B ; A");
sigB.set_from_host(true, null);
prg.react();
sigA.set_from_host(true, null);
prg.react();

// console.log("A ; B");
// sigA.set_from_host(true, null);
// prg.react();
// sigB.set_from_host(true, null);
// prg.react();

// console.log("R B ; A");
// sigR.set = true;
// sigB.set = true;
// prg.react();
// sigA.set = true;
// prg.react();
