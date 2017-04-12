"use hopscript"

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
       <button onclick=~{m.inputAndReact("A")}>A</button>
       <button onclick=~{m.inputAndReact("B")}>B</button>
       <button onclick=~{m.inputAndReact("R")}>R</button>
       <button onclick=~{m.react()}>∅</button>
       <div>
	 <react>~{
	    let valueO = m.value.O;
	    if (valueO == 1) {
	       return "O emitted only once.";
	    } else if (valueO > 1) {
	       return `O emitted ${valueO} times.`; 
	    } else {
	       return " ";
	    }
	 }</react>
       </div>
       <div>
	 <button onclick=~{m.reset();m._debuggerUpdate()}>
           Reset machine
	 </button>
       </div>
     </body>
   </html>
}
