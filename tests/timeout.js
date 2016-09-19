"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module X=${{initValue: 1}} Y Z>

	<hh.trap T>
	  <hh.let __internal=${{initValue: -1}}>
	    <hh.loop>
	      <hh.if apply=${function() {return this.preValue.__internal == -1}}>
		<hh.emit __internal apply=${function() {return this.value.X + 5}}/>
	      </hh.if>

	      <hh.if apply=${function() {return this.value.__internal == 0}}>
		<hh.exit T/>
	      </hh.if>

	      <hh.exec apply=${function() {
		 setTimeout(function(self) {
		    self.returnAndReact();
		 }, 500, this)
	      }}/>

	      <hh.emit Y/>
	      <hh.emit __internal apply=${function() {return this.preValue.__internal - 1}}/>
	    </hh.loop>
	  </hh.let>
	</hh.trap>

	<hh.emit Z/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);

m.addEventListener("Y", function(evt) {
   console.log("Y emitted");
});

m.addEventListener("Z", function(evt) {
   console.log("Z emitted");
});

m.react();
