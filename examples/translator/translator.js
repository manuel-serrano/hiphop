/*=====================================================================*/
/*    .../project/hiphop/hiphop/examples/translator/translator.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 00:58:52 2018                          */
/*    Last change :  Tue Sep 12 23:55:59 2023 (serrano)                */
/*    Copyright   :  2018-23 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Multiple parallel translations example                           */
/*    -------------------------------------------------------------    */
/*    run with:                                                        */
/*      http://localhost:8080/hop/trans                                */
/*=====================================================================*/
"use hopscript";

/*---------------------------------------------------------------------*/
/*    translator ...                                                   */
/*---------------------------------------------------------------------*/
service translator() {
   return <html>
     <head>
       <script type="module">
	 import { ReactiveMachine } from ${require.resolve("@hop/hiphop")};
	 import { trans } from ${require.resolve("./translator-hh.js")};
	 globalThis.m = new ReactiveMachine(trans);
       </script>
     </head>
     <style> * { font-size: 60px; color: black; }</style>
     <body>
       <input oninput=~{ m.react({ text: this.value }) }/>
       <div>
         <span style=~{ `color: ${m.colorEn.nowval}` }>
           <react>~{m.transEn.nowval}</react>
         </span> -
         <span style=~{ `color: ${m.colorNe.nowval}` }>
           <react>~{ m.transNe.nowval }</react>
         </span>
       </div>
       <div>
         <span style=~{ `color: ${m.colorEs.nowval}` }>
           <react>~{ m.transEs.nowval }</react>
         </span> -
         <span style=~{ `color: ${m.colorSe.nowval}` }>
           <react>~{ m.transSe.nowval }</react>
         </span>
       </div>
     </body>
   </html>;
}

console.log('go to "http://' + hop.hostname + ":" + hop.port + '/hop/translator"');	   
