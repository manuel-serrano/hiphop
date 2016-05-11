"use hopscript"

const hh = require("hiphop");

service bubble() {
   return <html>
     <head module=${"hiphop"}>
       ~{
	  var hh;
	  var m;
	  var proxy;

	  window.onload = function() {
	     hh = require("hiphop");
	     m = new hh.ReactiveMachine(
		<hh.module>
		  <hh.inputsignal name="left" />
		  <hh.inputsignal name="right" />
		  <hh.outputsignal name="bubble" valued init_value=0 />

		  <hh.loop>
		    <hh.present signal_name="left">
		      <hh.emit signal_name="bubble"
			       arg=${hh.preValue("bubble")}
			       func=${x => x - 1}/>
		    </hh.present>

		    <hh.present signal_name="right">
		      <hh.emit signal_name="bubble"
			       arg=${hh.preValue("bubble")}
			       func=${x => x + 1}/>
		    </hh.present>

		    <hh.pause/>
		  </hh.loop>
		</hh.module>, "bubble");
	     proxy = m.reactProxy("bubble");
	  }
       }
     </head>
     <body>
       <button onclick=~{m.inputAndReact("left");
			 console.error("<", proxy.value)}>&lt;</button>
       <span><react>~{proxy.value}</react></span>
       <button onclick=~{m.inputAndReact("right");
			 console.error(">", proxy.value)}>&gt;</button>
     </body>
   </html>
}
