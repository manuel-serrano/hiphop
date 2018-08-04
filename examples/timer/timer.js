/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/examples/timer/timer.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Sat Aug  4 13:41:32 2018                          */
/*    Last change :                                                    */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Timer example.                                                   */
/*=====================================================================*/
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports ...                                                      */
/*---------------------------------------------------------------------*/
require("hiphop");

/*---------------------------------------------------------------------*/
/*    timer ...                                                        */
/*---------------------------------------------------------------------*/
service timer() {
   return <html>
     <head>
       <script src="hiphop" lang="hopscript"/>
       <script src="./timer-hh.js" lang="hiphop"/>
       <script defer>
	 const m = require( "./timer-hh.js", "hiphop" );

	 window.onload = function() {
	    m.inputAndReact( "duration",
			     parseFloat( document.getElementById( "range-timer" )
                                         .value) );
	 }
       </script>
     </head>
     <body>
       <div>
         <span>Elapsed time:</span>
         <meter value=~{m.value.elapsed} max=~{parseInt( m.value.duration )}></meter>
       </div>
       <div>
	 <span><react>~{m.value.elapsed.toFixed( 1 )}</react></span><span>s</span>
       </div>
       <div>
         <span>Duration:</span>
         <input id="range-timer" type="range" min="0" max="100" value="50"
		onchange=~{m.inputAndReact( "duration", parseInt( this.value ) ) }/>
       </div>
       <div>
         <button onclick=~{m.inputAndReact( "reset" )}>Reset</button>
	 <button onclick=~{m.inputAndReact( "suspend", true )}
		 style=~{`background-color: ${m.value.suspendColor}`}>Suspend</button>
       </div>
     </body>
   </html>
}
//value=~{m.value.duration}

