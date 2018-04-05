"use hopscript"

//require("hiphop");

const path = require("path");
const PATH = path.dirname(module.filename);

service wristwatch(debug=null) {
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
	     if (${debug})
		machine.debuggerOn("debug");


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
       }
     </head>
     <style>
#cnv {
   width:500px;
   height:500px;
}
     </style>
     <body>
       <div style="float:left">
	 <canvas id="cnv"></canvas>

	 <div id="clock" class="light">
	   <div class="display">
	     <div class="ampm"
		  onclick=~{machine.inputAndReact("TOGGLE_24H_MODE_COMMAND")}>
	     </div>
	     <div class="alarm"></div>
	     <div class="digits"></div>
	   </div>
	 </div>
       </div>

       <div id="enter-settings">
	 <button onclick=~{(function() {
	    machine.inputAndReact("ENTER_SET_WATCH_MODE_COMMAND");
	    document.getElementById("settings").style.display = "inline";
	    document.getElementById("enter-settings").style.display = "none";
	 })()}>
	   Set
	 </button>
       </div>

       <div id="settings" style="display:none">
	 <button onclick=~{(function() {
	    machine.inputAndReact("EXIT_SET_WATCH_MODE_COMMAND");
	    document.getElementById("settings").style.display = "none";
	    document.getElementById("enter-settings").style.display = "inline";
	 })()}>
	   Exit
	 </button>
	 <button onclick=~{machine.inputAndReact("NEXT_WATCH_TIME_POSITION_COMMAND")}>
	   Next position
	 </button>
	 <button onclick=~{machine.inputAndReact("SET_WATCH_COMMAND")}>
	   Change
	 </button>
       </div>

     </body>
   </html>
}
