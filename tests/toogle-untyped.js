"use hopscript"

var rjs = require("hiphop");

function bool_and(x, y) {
   return x && y
}

function bool_or(x, y) {
   return x || y
}

function plus(x, y) {
   return x + y
}

var prg = <rjs.reactivemachine debug name="toogle">
  <rjs.outputsignal name="SEQ" init_value=1 combine_with=${plus}/>
  <rjs.outputsignal name="STATE1" init_value=false combine_with=${bool_or}/>
  <rjs.outputsignal name="STATE2" init_value=false combine_with=${bool_and}/>
  <rjs.outputsignal name="S"/>
  <rjs.outputsignal name="TOOGLE" type="boolean"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="SEQ"
		func=${(x, y) => x + y}
		exprs=${[rjs.preValue("SEQ"), 1]}/>
      <rjs.emit signal_name="STATE1" exprs=true />
      <rjs.emit signal_name="STATE1" exprs=false />
      <rjs.emit signal_name="STATE2" exprs=true />
      <rjs.emit signal_name="STATE2" exprs=false />
      <rjs.present test_pre signal_name="S">
	<rjs.emit signal_name="TOOGLE" exprs=true />
	<rjs.sequence>
	  <rjs.emit signal_name="TOOGLE" exprs=false />
	  <rjs.emit signal_name="S"/>
	</rjs.sequence>
      </rjs.present>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
