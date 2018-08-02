/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/examples/prims/prims.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Oct 16 08:45:43 2012                          */
/*    Last change :  Thu Aug  2 00:53:09 2018 (serrano)                */
/*    Copyright   :  2012-18 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Prim numbers aka the Darwin Sieve                                */
/*    -------------------------------------------------------------    */
/*    run with:                                                        */
/*      http://localhost:8080/hop/prims?width=300&height=300           */
/*=====================================================================*/
"use hopscript";

/*---------------------------------------------------------------------*/
/*    prims ...                                                        */
/*---------------------------------------------------------------------*/
service prims( o ) {
   if( !o ) o = {};
   
   let count = ~~o.count || 1;
   let width = ~~o.width || 400;
   let height = ~~o.height || 400;
   let speed = ~~o.speed || 20;
   let canvas = <canvas width=${width} height=${height}/>;

   return <html>
     <head css=${require.resolve( "./prims.hss" )}>
       <script src="hiphop" lang="hopscript"/>
       <script src="./client.js" lang="hiphop"/>
       <script defer>
	 const pc = require( "./client.js", "hiphop" );
	 window.onload = () => pc.start( ${canvas}, ${speed} );
       </script>
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
		onchange=~{pc.setSpeed( this.value )}/>
       </div>
     </body>
   </html>
}
       
	   
     
