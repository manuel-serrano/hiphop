import { Service } from "@hop";
import { ReactiveMachine } from "@hop/hiphop";

function abro() {
   return <html>
     <head>
       <script type="module" lang="@hop/hiphop">
	 hiphop machine prg() {
 	    in A; in B; in R; out O;
			   
             do {
		fork {
		   await(A.now);
		} par {
		   await(B.now);
		}
		emit O();
	     } every(R.now)
	  }
   
          prg.addEventListener("O", v => alert("got O: " + v));
	  globalThis.prg = prg;
       </script>
     </head>
     <body>
       <button onclick=~{prg.react("A")}>A</button>
       <button onclick=~{prg.react("B")}>B</button>
       <button onclick=~{prg.react("R")}>R</button>
     </body>
   </html>
}

new Hop.Service(abro, "abro");
