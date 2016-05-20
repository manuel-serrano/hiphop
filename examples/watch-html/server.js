"use hopscript"

const PATH = "/home/colin/phd/watch-html";

service clock() {
   return <html>
     <head module=${["hiphop",
		     "./wristwatch/watch/watch.js",
		     "./wristwatch/watch/watch-data.js",
		     "./wristwatch/basic/basic.js",
		     "./wristwatch/data/time-data.js",
		     "./wristwatch/data/beep-data.js"]}
	   script=${[PATH + "/analog/clock.js",
		     PATH + "/digital/assets/js/jquery.min.js",
		     PATH + "/digital/assets/js/script.js",
		     PATH + "/digital/assets/js/moment.min.js"]}
	   css=${PATH + "/digital/assets/css/style.css"}>
       ~{
	  var hh;
	  var watch_mod;
	  var watch_prg;
	  var watch_machine;

	  window.onload = function() {
	     hh = require("hiphop");
	     watch_mod = require("./wristwatch/watch/watch.js");
	     watch_prg = watch_mod.WatchModule;
	     machine = new hh.ReactiveMachine(watch_prg, "Watch");

	     machine.addEventListener("WATCH_TIME", function(evt) {
		var time = evt.signalValue;

		tick(time.hours, time.minutes, time.seconds, 0);
		digital_tick(time.hours, time.minutes, time.seconds, time.mode);
	     });

	     clock();
	     digital_init();
	     setInterval(function() {
		machine.inputAndReact("S");
	     }, 1000);
	  }

	  function mode() {
	     machine.inputAndReact("TOGGLE_24H_MODE_COMMAND");
	  }
       }
     </head>
     <style>
#cnv {
   position:absolute;
   top:30%;
   left:50%;
   width:500px;
   height:500px;
   margin:-250px 0 0 -250px;
}
     </style>
     <body>
       <canvas id="cnv"></canvas>

       <div id="clock" class="light">
	 <div class="display">
	   <div class="ampm" onclick=~{mode()}></div>
	   <div class="alarm"></div>
	   <div class="digits"></div>
	 </div>
       </div>
     </body>
   </html>
}
