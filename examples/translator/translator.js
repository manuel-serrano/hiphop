/*=====================================================================*/
/*    .../project/hiphop/0.2.x/examples/translator/translator.js       */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 00:58:52 2018                          */
/*    Last change :  Thu Aug  2 13:18:46 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Multiple parallel translations example                           */
/*    -------------------------------------------------------------    */
/*    run with:                                                        */
/*      http://localhost:8080/hop/trans                                */
/*=====================================================================*/
"use hopscript"

/*---------------------------------------------------------------------*/
/*    translator ...                                                   */
/*---------------------------------------------------------------------*/
service translator() {
   return <html>
     <head>
       <script src="hiphop" lang="hopscript"/>
       <script src="./translator-hh.js" lang="hiphop"/>
       <script defer>
	 const m = require( "./translator-hh.js", "hiphop" );
       </script>
     </head>
     <style> * { font-size: 60px; color: black; }</style>
     <body>
       <input oninput=~{ m.value.text = this.value }/>
       <div>
         <span style=~{ `color: ${m.value.colorEn}` }>
           <react>~{m.value.transEn}</react>
         </span> -
         <span style=~{ `color: ${m.value.colorNe}` }>
           <react>~{ m.value.transNe }</react>
         </span>
       </div>
       <div>
         <span style=~{ `color: ${m.value.colorEs}` }>
           <react>~{ m.value.transEs }</react>
         </span> -
         <span style=~{ `color: ${m.value.colorSe}` }>
           <react>~{ m.value.transSe }</react>
         </span>
       </div>
     </body>
   </html>;
}
