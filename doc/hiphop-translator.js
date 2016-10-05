"use hopscript"

const hh = require("hiphop");

service translator() {
   return <html>
     <head module=${"hiphop"}>
       ~{
	  var hh;
	  var m;
	  var trad;

	  function translate() {
	     var xhttp = new XMLHttpRequest();
	     var svc = "http://mymemory.translated.net/api/get";
	     var opt = "?langpair=fr|en&q=" + this.value.text;
	     xhttp.onreadystatechange = function() {
		if (xhttp.readyState == 4 && xhttp.status == 200) {
		   let res = JSON.parse(xhttp.responseText);

		   this.returnAndReact(res.responseData.translatedText);
		}
	     }.bind(this);
	     xhttp.open("GET", svc + opt, true);
	     xhttp.send();
	  }

	  onload = function() {
	     hh = require("hiphop");
	     m = new hh.ReactiveMachine(
		<hh.module text trad>
		  <hh.every immediate text>
		    <hh.exec trad apply=${translate}/>
		  </hh.every>
		</hh.module>);
	     trad = m.reactProxy("trad");
	  }
       }
     </head>
     <body>
       <input type="text" oninput=~{m.inputAndReact("text", this.value)}/>
       <div><react>~{trad.value}</react></div>
     </body>
   </html>;
}
