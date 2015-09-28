"use hopscript"

var rjs = require("./xml-compiler.js");
var rkernel = require("./reactive-kernel.js");

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
            </rjs.sequence>
        </rjs.abort>
    </rjs.loop>
</rjs.reactivemachine>;

prg.react();

console.log("A & B");
sigA.set = true;
sigB.set = true;
prg.react();

console.log("A ; A & B");
sigA.set = true;
prg.react();
sigB.set = true;
prg.react();

console.log("B ; A & B");
sigB.set = true;
prg.react();
sigA.set = true;
prg.react();

console.log("A & B");
sigA.set = true;
sigB.set = true;
prg.react();
prg.react();
prg.react();

console.log("A & R ; B");
sigA.set = true;
sigR.set = true;
prg.react();
// sigB.set = true;
// prg.react();

// console.log("A & B & R");
// sigA.set = true;
// sigB.set = true;
// sigR.set = true;
// prg.react();
