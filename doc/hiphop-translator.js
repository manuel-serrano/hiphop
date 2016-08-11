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
	     var opt = "?langpair=fr|en&q=" + this.value.in;
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
		<hh.module>
		  <hh.inputsignal name="in" valued/>
		  <hh.outputsignal name="trad" value=""/>

		  <hh.every immediate signal="in">
		    <hh.exec signal="trad" start=${translate}/>
		  </hh.every>
		</hh.module>);
	     trad = m.reactProxy("trad");
	  }
       }
     </head>
     <body>
       <input type="text" oninput=~{m.inputAndReact("in", this.value)}/>
       <div><react>~{trad.value}</react></div>
     </body>
   </html>;
}
