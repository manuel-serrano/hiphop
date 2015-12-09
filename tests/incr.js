"use hopscript"

function plus (x, y) { return x+y };

var rjs = require("hiphop");

var prg =
 <rjs.reactivemachine debug name="Incr">
    <rjs.inputsignal name="I"/>
    <rjs.inputsignal name="R"/>
    <rjs.outputsignal name="O" type="number" init_value=0 />
    <rjs.loop>
      <rjs.abort signal_name="R">
         <rjs.sequence>
            <rjs.await signal_name="I"/>
            <rjs.emit signal_name="O"
                      func=${plus}
                      exprs=${[rjs.preValue("O"), 1]}/>
            <rjs.pause/>
         </rjs.sequence>
      </rjs.abort>
    </rjs.loop>
 </rjs.reactivemachine>;

exports.prg = prg;
