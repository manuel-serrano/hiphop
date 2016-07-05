"use hopscript"

const hh = require("hiphop");

const execInterface = {
   start: function() {
      setTimeout(function(self) {
	 self.return();
      }, 500, this)
   },
   autoreact: hh.ANY
}

const prg =
      <hh.module>
	<hh.inputsignal name="X" value=1/>
	<hh.outputsignal name="Y"/>
	<hh.outputsignal name="Z"/>

	<hh.trap name="T">
	  <hh.let>
	    <hh.signal name="__internal" value=-1/>
	    <hh.loop>
	      <hh.if arg=${hh.preValue("__internal")} func=${v => v == -1}>
		<hh.emit signal="__internal"
			 arg=${hh.value("X")}
			 func=${x => x + 5}/>
	      </hh.if>

	      <hh.if arg=${hh.value("__internal")} func=${v => v == 0}>
		<hh.exit trap="T"/>
	      </hh.if>

	      <hh.exec interface=${execInterface}/>

	      <hh.emit signal="Y"/>
	      <hh.emit signal="__internal"
		       arg=${hh.preValue("__internal")}
		       func=${v => v - 1}/>
	    </hh.loop>
	  </hh.let>
	</hh.trap>

	<hh.emit signal="Z"/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);

m.addEventListener("Y", function(evt) {
   console.log("Y emitted");
});

m.addEventListener("Z", function(evt) {
   console.log("Z emitted");
});

m.react();
