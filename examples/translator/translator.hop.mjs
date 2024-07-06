/*=====================================================================*/
/*    .../hiphop/hiphop/examples/translator/translator.hop.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 00:58:52 2018                          */
/*    Last change :  Sat Jul  6 10:32:55 2024 (serrano)                */
/*    Copyright   :  2018-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Multiple parallel translations example                           */
/*    -------------------------------------------------------------    */
/*    run with:                                                        */
/*      http://localhost:8080/hop/trans                                */
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
/*    translator ...                                                   */
/*---------------------------------------------------------------------*/
function translator() {
   return <html>
     <head>
       <script type="importmap">
         {
	    "imports": {
	       "@hop/hop": "${R.url('./node_modules/@hop/hop/client.mjs')}",
	       "@hop/hiphop": "${R.url('./node_modules/@hop/hiphop/hiphop-client.mjs')}"
	    }
         }
       </script>
	<script type="module">
	 import { ReactiveMachine } from "@hop/hiphop";
         import { trans } from ${R.url(compileFileSync("./translator.hh.js"))}; 
         window.mach = new ReactiveMachine(trans);

         function updateColor(s) {
            const el = document.getElementById(s.signame);
            el.style.color = s.nowval;
         }
   
         function updateTrans(s) {
            const el = document.getElementById(s.signame);
            el.innerHTML = s.nowval;
         }
   
         mach.addEventListener("colorEn", updateColor);
         mach.addEventListener("colorNe", updateColor);
         mach.addEventListener("colorEs", updateColor);
         mach.addEventListener("colorSe", updateColor);
   
         mach.addEventListener("transEn", updateTrans);
         mach.addEventListener("transNe", updateTrans);
         mach.addEventListener("transEs", updateTrans);
         mach.addEventListener("transSe", updateTrans);
   
       </script>
     </head>
      <style> * { font-size: 60px; } </style>
     <body>
       <input oninput=~{ mach.react({ text: this.value }) }/>
       <div>
         <span id="colorEn">
            <span id="transEn">&nbsp;</span>
         </span> -
         <span id="colorNe">
            <span id="transNe">&nbsp;</span>
         </span>
       </div>
       <div>
         <span id="colorEs">
            <span id="transEs">&nbsp;</span>
         </span> -
         <span id="colorSe">
            <span id="transSe">&nbsp;</span>
         </span>
       </div>
     </body>
   </html>;
}

const t = hop.Service(translator, "/translator");
	  
await hop.listen();
       
console.log(`go to "${t()}"`);
