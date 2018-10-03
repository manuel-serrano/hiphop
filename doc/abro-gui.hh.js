"use hiphop";

service abro() {
   return <html>
     <head>
       <script src="hiphop" lang="hopscript"/>
       <script defer>
          const hh = require( "hiphop" );
   
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
   
          const mach = new hh.ReactiveMachine( prg );
          mach.addEvenListener( "O", (v) => { alert( "got O: " + v ) } );
       </script>
     </head>
     <body>
       <button onclick=~{mach.react( "A" )}>A</button>
       <button onclick=~{mach.react( "B" )}>B</button>
       <button onclick=~{mach.react( "R" )}>R</button>
     </body>
   </html>
}   

exports.prg = new hh.ReactiveMachine( prg, "ABRO" );
