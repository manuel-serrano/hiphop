"use hopscript"

var hh = require("hiphop");

function plus(a, b) {
   return a + b;
}

var prg =
    <hh.module>
      <hh.outputsignal name="S" valued />
      <hh.outputsignal name="I"/>
      <hh.outputsignal name="J" valued />
      <hh.loop>
	<hh.parallel>

	  <hh.let>
	    <hh.signal name="M" init_value=5 />
	    <hh.emit signal="J" arg=${hh.value("M")}/>
	    <hh.pause/>
	    <hh.emit signal="M" arg=5 />
	  </hh.let>

	  <hh.let>
	    <hh.signal name="N"/>
	    <hh.present signal="N">
	      <hh.emit signal="I"/>
	    </hh.present>
	    <hh.pause/>
	    <hh.emit signal="N"/>
	  </hh.let>

	  <hh.let>
	    <hh.signal name="L" valued />
	    <hh.emit signal="L" arg=4 />
	    <hh.pause/>
	    <hh.emit signal="S" func=${plus} arg0=${hh.value("L")} arg1=5/>
	  </hh.let>

	</hh.parallel>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "reincar2");
