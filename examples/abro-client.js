"use hopscript"

//
// Mandatory, to enable WebSocketServer of the debugger.
//
require("hiphop");

service abro() {
   return <html>
     <head module=${"hiphop"}>
       ~{
	  var hh;
	  var m;

	  window.onload = function() {
	     hh = require("hiphop");
	     m = new hh.ReactiveMachine(
		<hh.module A B R O=${{initValue: 0}}>
		  <hh.loopeach R>
		    <hh.parallel>
		      <hh.await A/>
		      <hh.await B/>
		    </hh.parallel>
		    <hh.emit O apply=${function() {
		       return this.preValue.O + 1;
		    }}/>
		  </hh.loopeach>
		</hh.module>);
	     m.debuggerOn("debug");
	  }
       }
     </head>
     <body>
       <button onclick=~{m.value.A = 0}>A</button>
       <button onclick=~{m.value.B = 0}>B</button>
       <button onclick=~{m.value.R = 0}>R</button>
       <button onclick=~{m.react();}>∅</button>
       <div>O emitted <react>~{m.value.O}</react> times.</div>
     </body>
   </html>
}
