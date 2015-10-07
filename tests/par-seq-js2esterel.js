var rjs = require("../xml-compiler.js");
var js2esterel = require("../js2esterel");

var prg = <rjs.ReactiveMachine>
    <rjs.Parallel>
    <rjs.sequence>
    <rjs.nothing/>
    <rjs.pause/>
    </rjs.sequence>
<rjs.Nothing/>
</rjs.Parallel>
</rjs.ReactiveMachine>;

console.log(prg.esterel_code());
