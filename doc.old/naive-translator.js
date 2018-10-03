"use hopscript"

service translator() {
   return <html>
     <head>
       ~{
	  var trad;

	  function translate(value) {
	     var xhttp = new XMLHttpRequest();
	     var svc = "http://mymemory.translated.net/api/get";
	     var opt = "?langpair=fr|en&q=" + value;
	     xhttp.onreadystatechange = function() {
		if (xhttp.readyState == 4 && xhttp.status == 200) {
		   let res = JSON.parse(xhttp.responseText);

		   trad.value = res.responseData.translatedText
		}
	     }.bind(this);
	     xhttp.open("GET", svc + opt, true);
	     xhttp.send();
	  }

	  onload = function() {
	      trad = hop.reactProxy({value: ""});
	  }
       }
     </head>
     <body>
       <input type="text" oninput=~{translate(this.value)}/>
       <div><react>~{trad.value}</react></div>
     </body>
   </html>;
}
