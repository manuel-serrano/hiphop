"use hopscript"

var hh = require("hiphop");

function bool_and(x, y) {
   return x && y
}

function bool_or(x, y) {
   return x || y
}

function plus(x, y) {
   return x + y
}

var prg = <hh.module>
  <hh.outputsignal name="SEQ" init_value=1 combine_with=${plus}/>
  <hh.outputsignal name="STATE1" init_value=false combine_with=${bool_or}/>
  <hh.outputsignal name="STATE2" init_value=false combine_with=${bool_and}/>
  <hh.outputsignal name="S"/>
  <hh.outputsignal name="TOOGLE" valued/>
  <hh.loop>
    <hh.sequence>
      <hh.emit signal="SEQ"
		func=${(x, y) => x + y}
		arg0=${hh.preValue("SEQ")} arg1=1/>
      <hh.emit signal="STATE1" arg=true />
      <hh.emit signal="STATE1" arg=false />
      <hh.emit signal="STATE2" arg=true />
      <hh.emit signal="STATE2" arg=false />
      <hh.present test_pre signal="S">
	<hh.emit signal="TOOGLE" arg=true />
	<hh.sequence>
	  <hh.emit signal="TOOGLE" arg=false />
	  <hh.emit signal="S"/>
	</hh.sequence>
      </hh.present>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "toogle");
