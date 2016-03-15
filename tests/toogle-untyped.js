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
      <hh.emit signal_name="SEQ"
		func=${(x, y) => x + y}
		args=${[hh.preValue("SEQ"), 1]}/>
      <hh.emit signal_name="STATE1" args=true />
      <hh.emit signal_name="STATE1" args=false />
      <hh.emit signal_name="STATE2" args=true />
      <hh.emit signal_name="STATE2" args=false />
      <hh.present test_pre signal_name="S">
	<hh.emit signal_name="TOOGLE" args=true />
	<hh.sequence>
	  <hh.emit signal_name="TOOGLE" args=false />
	  <hh.emit signal_name="S"/>
	</hh.sequence>
      </hh.present>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "toogle");
