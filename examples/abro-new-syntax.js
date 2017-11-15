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
		MODULE {
		   INOUT a, b, r;
		   OUT o(0);
		   LOOPEACH(NOW(r)) {
		      FORK {
			 AWAIT(NOW(a));
		      } PAR {
			 AWAIT(NOW(b));
		      }
		      EMIT o(PREVAL(o) + 1);
		   }
		}
	     );
	  }
       }
     </head>
     <body>
       <button onclick=~{m.inputAndReact("a")}>A</button>
       <button onclick=~{m.inputAndReact("b")}>B</button>
       <button onclick=~{m.inputAndReact("r")}>R</button>
       <button onclick=~{m.react()}>-</button>
       <div>
	 <react>~{
	    let valueO = m.value.o;
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
	 <react>~{m.present.a ? "A emitted!" : " "}</react>
       </div>
       <div>
	 <react>~{m.present.b ? "B emitted!" : " "}</react>
       </div>
       <div>
	 <react>~{m.present.r ? "R emitted!" : " "}</react>
       </div>
       <div>
	 <react>~{m.present.o ? "O emitted!" : " "}</react>
       </div>
     </body>
   </html>
}
