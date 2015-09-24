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
