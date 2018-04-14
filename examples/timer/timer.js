"use hopscript"

require("hiphop");

service timer() {
   return <html>
     <head>
       <script src="hiphop" lang="hopscript"/>
       <script src="./timer-hh.js" lang="hiphop"/>
       ~{
          var m;
          window.onload = function() {
	     m = require("./timer-hh.js", "hiphop");
	     m.inputAndReact("duration",
			     parseFloat(document.getElementById("range-timer").value))
	  }
       }
     </head>
     <body>
       <div>
         <span>Elapsed time:</span>
         <meter value=~{m.value.elapsed} max=~{parseInt(m.value.duration)}></meter>
       </div>
       <div>
	 <span><react>~{m.value.elapsed.toFixed(1)}</react></span><span>s</span>
       </div>
       <div>
         <span>Duration:</span>
         <input id="range-timer" type="range" min="0" max="100" value="50"
		onchange=~{m.inputAndReact("duration", parseInt(this.value))}/>
       </div>
       <div>
         <button onclick=~{m.inputAndReact("reset")}>Reset</button>
	 <button onclick=~{m.inputAndReact("suspend", true)}
		 style=~{`background-color: ${m.value.suspendColor}`}>Suspend</button>
       </div>
     </body>
   </html>
}
//value=~{m.value.duration}

