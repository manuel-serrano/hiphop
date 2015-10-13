"use hopscript"

var rjs = require("../../xml-compiler.js");
var rkernel = require("../../reactive-kernel.js");
var inspector = require("../../inspector.js");
var batch = require("../../batch-interpreter.js");

var sigA = new rkernel.Signal("A", false);
var sigB = new rkernel.Signal("B", false);
var sigR = new rkernel.Signal("R", false);
var sigO = new rkernel.Signal("O", false);

var prg = <rjs.reactivemachine name="ABRO">
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

batch.interpreter(prg);
exports.abro = prg;
