/*=====================================================================*/
/*    .../prgm/project/hiphop/hiphop/examples/prims/prims.hop.mjs      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Oct 16 08:45:43 2012                          */
/*    Last change :  Fri Jul  5 20:39:05 2024 (serrano)                */
/*    Copyright   :  2012-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Prim numbers aka the Darwin Sieve                                */
/*    -------------------------------------------------------------    */
/*    run with:                                                        */
/*      http://localhost:8080/hop/prims?width=300&height=300           */
/*=====================================================================*/
import { Hop } from "@hop/hop";
import { compileFileSync } from "@hop/hiphop/lib/hhc-compiler.mjs";

/*---------------------------------------------------------------------*/
/*    Server configuration                                             */
/*---------------------------------------------------------------------*/
const anonymous = {
   name: "anonymous",
   services: "*",
   directories: "*",
   events: "*"
};
const config = { users: [ anonymous ], ports: { http: 8888} };
const hop = new Hop(config);
const R = hop.Resolver(import.meta.url);

/*---------------------------------------------------------------------*/
/*    prims ...                                                        */
/*---------------------------------------------------------------------*/
function prims(o) {
   if (!o) o = {};
   
   let count = ~~o.count || 1;
   let width = ~~o.width || 600;
   let height = ~~o.height || 400;
   let speed = ~~o.speed || 20;
   let canvas = <canvas id="can" width=${width} height=${height}/>;

   return <html>
     <head>
       <link rel="stylesheet" href=${R.url("./prims.hss")}/>
       <link rel="shortcut icon" href="#"/>
       <script type="importmap">
         {
	    "imports": {
	       "@hop/hop": "${R.url('./node_modules/@hop/hop/client.mjs')}",
	       "@hop/hiphop": "${R.url('./node_modules/@hop/hiphop/hiphop-client.mjs')}"
	    }
         }
       </script>
       <script type="module">
         import * as pc from ${R.url(compileFileSync("./client.hh.js"))};
         window.onload = () => pc.start(document.getElementById("can"), ${speed});
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
	     
const p = hop.Service(prims, "/prims");

await hop.listen();
       
console.log(`go to "${p()}"`);
