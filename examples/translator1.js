"use hopscript"

service translator() {
   return <html>
     <head module=${"hiphop"}>
       ~{
	  var hh;
	  var m;
	  var en, enColor;
	  var es, esColor;

	  window.onload = function() {
	     hh = require("hiphop");

	     function EXECCOLOR( attr, body ) {
		return <hh.sequence>
		  <hh.emit signal=${`${attr.lang}-color`} arg="red"/>
		  <hh.exec signal=${`${attr.lang}-out`}
			   interface=${exec_interface}
			   arg0=${attr.lang}
			   arg1=${hh.value("fr-in")}/>
		  <hh.emit signal=${`${attr.lang}-color`} arg="blue"/>
		</hh.sequence>
	     }

	     const exec_interface = {
		start: function(lang, totranslate) {
		   var xhttp = new XMLHttpRequest();
		   var svc = "http://mymemory.translated.net/api/get";
		   var opt = "?langpair=fr|" + lang + "&q=" + totranslate;

		   xhttp.onreadystatechange = function() {
		      if (xhttp.readyState == 4 && xhttp.status == 200) {
			 let res = JSON.parse(xhttp.responseText);
			 let trad = res.responseData.translatedText

			 this.return(trad);
		      }
		   }.bind(this);
		   xhttp.open("GET", svc + opt, true);
		   xhttp.send();
		},
		autoreact: hh.ANY
	     };

	     m =  new hh.ReactiveMachine(
		<hh.module>
		  <hh.inputsignal name="fr-in" combine=${(a, b) => b}/>
		  <hh.outputsignal name="en-out" value="??"/>
		  <hh.outputsignal name="en-color" value="green"/>
                  <hh.outputsignal name="es-out" value="Â¿?"/>
		  <hh.outputsignal name="es-color" value="green"/>

		  <hh.loopeach signal="fr-in">
		    <hh.parallel>
		      <execColor lang="en"/>
		      <execColor lang="es"/>
		    </hh.parallel>
		  </hh.loopeach>
		</hh.module>
	     );

	     en = m.reactProxy("en-out");
	     es = m.reactProxy("es-out");
	     enColor = m.reactProxy("en-color");
	     esColor = m.reactProxy("es-color");
	  }
       }
     </head>
     <body>
       <input type="text" oninput=~{m.inputAndReact("fr-in", this.value)}/>
       <div style=~{`color: ${enColor.value}`}>english: <react>~{en.value}</react></div>
       <div style=~{`color: ${esColor.value}`}>spanish: <react>~{es.value}</react></div>
     </body>
   </html>;
}
