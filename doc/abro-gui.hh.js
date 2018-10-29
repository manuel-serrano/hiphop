"use hiphop";

service abro() {
   return <html>
     <head>
       <script src="hiphop" lang="hopscript"/>
       <script defer>
          hiphop module prg( in A, in B, in R, out O ) {
             do {
		fork {
		   await now( A );
		} par {
		   await now( B );
		}
		emit O();
	     } every( now( R ) )
	  }
   
          prg.addEvenListener( "O", v => alert( "got O: " + v ) );
       </script>
     </head>
     <body>
       <button onclick=~{prg.react( "A" )}>A</button>
       <button onclick=~{prg.react( "B" )}>B</button>
       <button onclick=~{prg.react( "R" )}>R</button>
     </body>
   </html>
}   
