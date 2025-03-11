/*=====================================================================*/
/*    .../project/hiphop/hiphop/examples/matrix/matrix.hop.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Oct 16 08:45:43 2012                          */
/*    Last change :  Tue Mar 11 15:33:05 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Matrix graphical animation                                       */
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
/*    matrix ...                                                       */
/*---------------------------------------------------------------------*/
function matrix(o) {
   if (!o) o = {};
   
   let count = ~~o.count || 1;
   let width = ~~o.width || 600;
   let height = ~~o.height || 400;
   let speed = ~~o.speed || 20;
   let canvasslow = <canvas id="canslow" width=${width} height=${height}/>;
   let canvasfast = <canvas id="canfast" width=${width} height=${height}/>;
   let chronoslow = <span id="chronoslow" style="font-size: 70%">-</span>;
   let chronofast = <span id="chronofast" style="font-size: 70%">-</span>;

   return <html>
     <head>
       <link rel="stylesheet" href=${R.url("./matrix.hss")}/>
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
         window.onload = () => {
            pc.animateCanvas(document.getElementById("canslow"), document.getElementById("chronoslow"), false);
            pc.animateCanvas(document.getElementById("canfast"), document.getElementById("chronofast"), true);
	 };
	 window.pc = pc;
       </script>
     </head>
   <body>
      <h1>net list ${chronoslow}</h1>
      <div>
        ${canvasslow}
      </div>
      <h1>native ${chronofast}</h1>
      <div>
        ${canvasfast}
      </div>
     </body>
   </html>
}
	     
const p = hop.Service(matrix, "/matrix");

await hop.listen();
       
console.log(`go to "${p()}"`);
