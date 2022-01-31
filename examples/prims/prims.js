/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/examples/prims/prims.js       */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Oct 16 08:45:43 2012                          */
/*    Last change :  Mon Dec 27 11:25:16 2021 (serrano)                */
/*    Copyright   :  2012-21 Manuel Serrano                            */
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
service prims(o) {
   if (!o) o = {};
   
   let count = ~~o.count || 1;
   let width = ~~o.width || 600;
   let height = ~~o.height || 400;
   let speed = ~~o.speed || 20;
   let canvas = <canvas width=${width} height=${height}/>;

   return <html>
     <head css=${require.resolve("./prims.hss")}>
       <link rel="shortcut icon" href="#"/>
       <script type="module">
	 import * as pc from ${require.resolve("./client.js")};
	 window.onload = () => pc.start(${canvas}, ${speed});
	 globalThis.pc = pc;
       </script>
     </head>
     <body>
       ${canvas}
       <div style=${`width: ${width}px; back`}>
	 <div>
	   <button onclick=~{pc.pause()}>Pause</button>
	   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
	   ${[1,5,10,25,100].map(function(el, idx, arr) {
	      return <button onclick=~{pc.addNumber(${el})}>
	        Add ${el}
	      </button>
	   })}
	 </div>
         <table id="slide-label">
           <tr>
	     <td>slow</td>
	     <td>
	       <input type=range 
                      min=0 max=100 value=${100 - speed}
		      onchange=~{pc.setSpeed(100 - this.value)}/>
             </td>
	     <td>fast</td></tr>
	 </table>
       </div>
     </body>
   </html>
}
       
console.log('go to "http://' + hop.hostname + ":" + hop.port + '/hop/prims"');	   
