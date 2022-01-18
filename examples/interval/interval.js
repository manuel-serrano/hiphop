/*=====================================================================*/
/*    .../prgm/project/hiphop/hiphop/examples/interval/interval.js     */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Sat Aug  4 13:41:32 2018                          */
/*    Last change :  Tue Jan 18 13:17:58 2022 (serrano)                */
/*    Copyright   :  2018-22 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Timer example.                                                   */
/*=====================================================================*/
"use @hop/hiphop";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    interval ...                                                     */
/*---------------------------------------------------------------------*/
service interval() {
   return <html>
     <head>
       <link rel="shortcut icon" href="#"/>
       <script type="module" lang="@hop/hiphop">
         import { ReactiveMachine } from ${require.resolve("@hop/hiphop")};
         import { interval, Interval } from ${require.resolve("@hop/hiphop/modules/interval.hh.js")};
				   
	 hiphop module main() implements Interval {
            inout duration;							   
	    inout step;

            do {
               run interval(duration.nowval, step.nowval) { * };
	    } every (duration.now || step.now);
	 }
	 
	 globalThis.m = new ReactiveMachine(main);

	 globalThis.stateColors = {
	    suspended: "red",
	    running: "green",
	    finished: "grey"
	 };
	 
	 window.onload = function() {
	    const initDuration = parseInt(document.getElementById("range-interval").value);
	    const initStep = parseInt(document.getElementById("step-interval").value);
	    m.react({duration: initDuration, step: initStep});
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
/								   
	 <span><react>~{m.duration.nowval.toFixed(1)}</react></span><span>s</span>
       </div>
       <div>
         <span>Duration:</span>
         <input id="range-interval" type="range" min="0" max="10000" value="5000"
		onchange=~{m.react({duration: parseInt(this.value)})}/>
         <span>Step:</span>
         <input id="step-interval" type="range" min="0" max="1000" value="500"
		onchange=~{m.react({step: parseInt(this.value)})}/>
       </div>
       <div>
         <button onclick=~{m.react({reset: true})}>Reset</button>
	 <button onclick=~{m.react({suspend: true})}
		 style=~{`background-color: ${stateColors[m.state.nowval]}`}>Suspend</button>
       </div>
     </body>
   </html>
}

