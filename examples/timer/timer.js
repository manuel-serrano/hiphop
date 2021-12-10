/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/examples/timer/timer.js       */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Sat Aug  4 13:41:32 2018                          */
/*    Last change :  Fri Dec 10 08:07:33 2021 (serrano)                */
/*    Copyright   :  2018-21 Manuel Serrano                            */
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
       <link rel="shortcut icon" href="#"/>
       <script src="hiphop" lang="hopscript"/>
       <script src="./timer-hh.js" lang="hiphop"/>
       <script defer>
	 const m = require("./timer-hh.js", "hiphop");

	 window.onload = function() {
	    const dur = parseInt(document.getElementById("range-timer").value);
	    m.react({duration: dur});
	 }
       </script>
     </head>
     <body>
       <div>
         <span>Elapsed time:</span>
         <meter value=~{m.elapsed.nowval} max=~{parseInt(m.duration.nowval)}></meter>
       </div>
       <div>
	 <span><react>~{m.elapsed.nowval.toFixed(1)}</react></span><span>s</span>
       </div>
       <div>
         <span>Duration:</span>
         <input id="range-timer" type="range" min="0" max="100" value="50"
		onchange=~{m.react({duration: parseInt(this.value)})}/>
       </div>
       <div>
         <button onclick=~{m.react({reset: true})}>Reset</button>
	 <button onclick=~{m.react({suspend: true})}
		 style=~{`background-color: ${m.suspendColor?.nowval || "grey"}`}>Suspend</button>
       </div>
     </body>
   </html>
}
//value=~{m.value.duration}

