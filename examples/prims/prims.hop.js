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
import * as hop from "@hop/hop";

/*---------------------------------------------------------------------*/
/*    R ... hop resolver                                               */
/*---------------------------------------------------------------------*/
const R = new hop.Resolver(import.meta.url, "@hop/hiphop/lib/hiphop-loader.mjs");

/*---------------------------------------------------------------------*/
/*    prims ...                                                        */
/*---------------------------------------------------------------------*/
async function prims(o) {
   if (!o) o = {};
   
   let count = ~~o.count || 1;
   let width = ~~o.width || 600;
   let height = ~~o.height || 400;
   let speed = ~~o.speed || 20;
   let canvas = <canvas width=${width} height=${height}/>;

   return <html>
     <head>
       <link rel="stylesheet" href=${await R.resolve("./prims.hss")}/>
       <link rel="shortcut icon" href="#"/>
       <script type="importmap">
         {
	    "imports": {
	       "@hop/hop": "${await R.resolve('@hop/hop/hop-client.mjs')}",
	       "@hop/hiphop": "${await R.resolve('@hop/hiphop')}"
	    }
         }
       </script>
       <script type="module">
	 import * as pc from ${await R.resolve("./client.hh.js")};
	 window.onload = () => pc.start(${canvas}, ${speed});
	 window.pc = pc;
       </script>
     </head>
     <body>
       ${canvas}
       <div style=${`width: ${width}px; back`}>
	 <div>
	   <button onclick=~{pc.pause()}>Pause</button>
	   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
           ${[1,5,10,25,100].map((el, idx, arr) => 
              <button onclick=~{pc.addNumber(${el})}>
	        Add ${el}
	      </button>)}
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
	     
new hop.Service(prims, "/prims");
       
console.log('go to "http://' + hop.hostname + ":" + hop.port + '/prims"');	   
