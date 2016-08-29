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
		  <hh.emit signal=${`${attr.lang}-color`} value="red"/>
		  <hh.exec signal=${`${attr.lang}-out`}
			   start=${function() {
			      var xhttp = new XMLHttpRequest();
			      var svc = "http://mymemory.translated.net/api/get";
			      var opt = "?langpair=fr|" + attr.lang + "&q=" + this.value.fr_in;

			      xhttp.onreadystatechange = function() {
				 if (xhttp.readyState == 4 && xhttp.status == 200) {
				    let res = JSON.parse(xhttp.responseText);
				    let trans = res.responseData.translatedText

				    this.returnAndReact(trans);
				 }
			      }.bind(this);
			      xhttp.open("GET", svc + opt, true);
			      xhttp.send();
			   }}/>
		  <hh.emit signal=${`${attr.lang}-color`} value="blue"/>
		</hh.sequence>
	     }

	     m =  new hh.ReactiveMachine(
		<hh.module>
		  <hh.inputsignal name="fr_in" combine=${(a, b) => b}/>
		  <hh.outputsignal name="en-out" value="??"/>
		  <hh.outputsignal name="en-color" value="green"/>
                  <hh.outputsignal name="es-out" value="Â¿?"/>
		  <hh.outputsignal name="es-color" value="green"/>

		  <hh.loopeach signal="fr_in">
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
       <input type="text" oninput=~{m.inputAndReact("fr_in", this.value)}/>
       <div style=~{`color: ${enColor.value}`}>english: <react>~{en.value}</react></div>
       <div style=~{`color: ${esColor.value}`}>spanish: <react>~{es.value}</react></div>
     </body>
   </html>;
}
