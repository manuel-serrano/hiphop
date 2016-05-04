"use hopscript";

service candycrash(params) {
   if(!params)
      params = {};

   let count = ~~params.count || 1;
   let width = ~~params.width || 800;
   let height = ~~params.height || 800;
   let speed = ~~params.speed || 200;
   let canvas = <canvas width=${width} height=${height} style="border:1px dotted black;"/>;

   return <html>
     <head module=${["./client.js", "hiphop"]}>
       ~{
	  var client;
	  window.onload = function() {
	     client = require(${require.resolve("./client.js")});
	     client.start(${canvas}, ${speed});
	  }
	}
     </head>
     <body>
       ${canvas}
       <div style=${`width: ${width}px; back`}>
	 <div>
	   <button onclick=~{client.pause()}>Pause</button>
	   <button onclick=~{client.add_candy()}>Add candy</button>
	 </div>
	 <input type=range style=${`width: ${width}px`}
		min=0 max=100 value=${speed}
		onchange=~{client.set_speed( this.value)}/>
     </div>
     </body>
   </html>
}
