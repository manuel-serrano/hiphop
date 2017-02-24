/*=====================================================================*/
/*    serrano/prgm/project/hiphop/prims/prims.js                       */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Oct 16 08:45:43 2012                          */
/*    Last change :  Mon Jan 18 14:57:06 2016 (serrano)                */
/*    Copyright   :  2012-16 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Prims number aka the Darwin Sieve                                */
/*    -------------------------------------------------------------    */
/*    run with:                                                        */
/*      http://localhost:8080/hop/prims?width=300&height=300           */
/*=====================================================================*/
"use hopscript";

require("hiphop");

/*---------------------------------------------------------------------*/
/*    prims ...                                                        */
/*---------------------------------------------------------------------*/
service prims( o ) {
   if( !o ) o = {};
   
   let count = ~~o.count || 1;
   let width = ~~o.width || 400;
   let height = ~~o.height || 400;
   let speed = ~~o.speed || 200;
   let canvas = <canvas width=${width} height=${height}/>;

   return <html>
     <head module=${ [ "./client.js", "hiphop" ] }
	   css=${require.resolve( "./prims.hss" )}>
       ~{ var pc;
	  window.onload = function() {
	     pc = require( ${require.resolve( "./client.js" )} );
	     pc.start( ${canvas}, ${speed} );
	  }
	}
     </head>
     <body>
       ${canvas}
       <div style=${`width: ${width}px; back`}>
	 <div>
	   <button onclick=~{pc.pause()}>Pause</button>
	   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
	   ${[1,5,10,25,100].map( function( el, idx, arr ) {
	      return <button onclick=~{pc.addNumber( ${el} )}>
	        Add ${el}
	      </button>
	   })}
	 </div>
	 <input type=range style=${`width: ${width}px`}
		min=0 max=100 value=${speed}
		onchange=~{pc.setSpeed( this.value)}/>
       </div>
     </body>
   </html>
}
       
	   
     
