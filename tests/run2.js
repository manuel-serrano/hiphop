"use hopscript"

var hh = require("hiphop");

var m1 = <hh.module>
     <hh.inputsignal name="T"/>
     <hh.inputsignal name="W"/>
     <hh.outputsignal name="V"/>
     <hh.outputsignal name="Z"/>
     <hh.parallel>
       <hh.present signal="T">
	 <hh.localsignal name="L">
	   <hh.sequence>
	     <hh.emit signal="L"/>
	     <hh.emit signal="V"/>
	   </hh.sequence>
	 </hh.localsignal>
       </hh.present>
       <hh.present signal="W">
	 <hh.emit signal="Z"/>
       </hh.present>
     </hh.parallel>
   </hh.module>;

var m2 = <hh.module>
  <hh.inputsignal name="S"/>
  <hh.inputsignal name="U"/>
  <hh.outputsignal name="A"/>
  <hh.outputsignal name="B"/>
  <hh.sequence>
    <hh.localsignal name="L">
      <hh.emit signal="L"/>
    </hh.localsignal>
    <hh.run module=${m1} sigs_assoc=${{"T":"S",
					"W":"U",
					"V":"A",
					"Z":"B"}}/>
    <hh.run module=${m1} sigs_assoc=${{"T":"S",
					"W":"U",
					"V":"A",
					"Z":"B"}}/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(m2, "run22");
