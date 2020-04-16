"use hopscript"
let hh = require("hiphop");

let prg =
    <hh.module O1 O2  OUTER=${{initValue: 0}}>
      <hh.atom apply=${function(){console.log("dans atom")}}/>
      <hh.emit O1 apply=${function() {console.log("emit o1");return this.OUTER.nowval}}/>
      <hh.atom apply=${function(){console.log("apres atom")}}/>
      <hh.emit OUTER value=1/>
      <hh.emit O2 apply=${function() {return this.OUTER.nowval}}/>
    </hh.module>;

let machine = new hh.ReactiveMachine(prg, "TEST");
try {
   machine.react();
} catch( e ) {
   console.log( "causality error" );
}
