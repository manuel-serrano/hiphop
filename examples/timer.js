"use hopscript"

require("hiphop");

service timer() {
   return <html>
     <head module="hiphop">
       ~{
          var m;

          window.onload = function() {
             let hh = require("hiphop");

	     function timeoutMod(nms) {
		return MODULE {
		   EXEC setTimeout(DONEREACT, nms) ONRES setTimeout(DONEREACT, nms)
		}
	     }

	     let basicTimer = MODULE {
		IN duration(0);
		OUT elapsed;
		EMIT elapsed(0);
		LOOP {
		   IF (VAL(elapsed) < VAL(duration)) {
		      RUN(timeoutMod(100));
		      EMIT elapsed(PREVAL(elapsed) + 0.1);
		   } ELSE {
		      PAUSE;
		   }
		}
	     }

	     let timer = MODULE {
		IN duration(0), reset;
		OUT elapsed;
		LOOPEACH(NOW(reset)) {
		   RUN(basicTimer);
		}
	     }

	     let suspendableTimer = MODULE {
		IN reset, suspend;
		OUT elapsed(0), suspendColor;
		INOUT duration;

		LOOPEACH(NOW(reset)) {
		   FORK {
		      SUSPEND TOGGLE(NOW(suspend)) {
			 RUN(timer);
		      }
		   } PAR {
		      EMIT suspendColor("transparent");
		      LOOP {
			 AWAIT(NOW(suspend));
			 EMIT suspendColor("orange");
			 AWAIT(NOW(suspend));
			 EMIT suspendColor("transparent");
		      }
		   }
		}
	     }

	     m = new hh.ReactiveMachine(suspendableTimer, {sweep:false});
	     let initduration = parseFloat(document.getElementById("range-timer").value);
	     m.inputAndReact("duration", initduration);
	     console.log(m.stats());
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

