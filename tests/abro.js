"use hopscript"

var rjs = require("../xml-compiler.js");
var rkernel = require("../reactive-kernel.js");
var inspector = require("../inspector.js");

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

prg.react();

sigA.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();

sigA.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();

sigR.set_from_host(true, null);
prg.react();

sigA.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();

sigA.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();

sigR.set_from_host(true, null);
prg.react();

// (new inspector.Inspector(prg)).inspect();

sigB.set_from_host(true, null);
prg.react();
sigA.set_from_host(true, null);
prg.react();

sigA.set_from_host(true, null);
prg.react();
sigB.set_from_host(true, null);
prg.react();

sigR.set_from_host(true, null);
sigB.set_from_host(true, null);
prg.react();
sigA.set_from_host(true, null);
prg.react();
prg.react();

sigB.set_from_host(true, null);
prg.react();

exports.abro = prg;
