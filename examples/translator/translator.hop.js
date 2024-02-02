/*=====================================================================*/
/*    .../hiphop/1.3.x/examples/translator/translator.hop.js           */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 00:58:52 2018                          */
/*    Last change :  Fri Feb  2 09:21:57 2024 (serrano)                */
/*    Copyright   :  2018-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Multiple parallel translations example                           */
/*    -------------------------------------------------------------    */
/*    run with:                                                        */
/*      http://localhost:8080/hop/trans                                */
/*=====================================================================*/
import * as hop from "@hop/hop";

/*---------------------------------------------------------------------*/
/*    R ... hop resolver                                               */
/*---------------------------------------------------------------------*/
const R = new hop.Resolver(import.meta.url, "@hop/hiphop/lib/hiphop-loader.mjs");

/*---------------------------------------------------------------------*/
/*    translator ...                                                   */
/*---------------------------------------------------------------------*/
async function translator() {
   return <html>
     <head>
       <script type="importmap">
         {
	    "imports": {
	       "@hop/hop": "${await R.resolve('@hop/hop/hop-client.mjs')}",
	       "@hop/hiphop": "${await R.resolve('@hop/hiphop/hiphop-client.mjs')}"
	    }
         }
       </script>
	<script type="module">
	 import { ReactiveMachine } from "@hop/hiphop";
	 import { trans } from ${await R.resolve("./translator.hh.js")}; 
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

new hop.Service(translator, "/translator");
	  
console.log('go to "http://' + hop.hostname + ":" + hop.port + '/translator"');	   
// node --no-warnings --enable-source-maps --loader ./node_modules/@hop/hop/lib/hop-loader.mjs --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs ./translator.hop.js
