"use hopscript"

const debug = require("hiphop");

service clickAndSearch() {
   return <html>
     <head module=${"hiphop"}>
     ~{
	var hh;
	var m;

	function searchWiki(wordId, doneReact) {
	   var word = document.getElementById(wordId).innerHTML;
	   ${wiki}(word).post(function(r) {
	      doneReact(r);
	   });
	}

	function translate(wordId, doneReact) {
	   var word = document.getElementById(wordId).innerHTML;
	   var req = new XMLHttpRequest();
	   var svc = "http://mymemory.translated.net/api/get?langpair=en|fr&q=" + word;
	   req.onreadystatechange = function() {
	      if (req.readyState == 4 && req.status == 200)
		 doneReact(JSON.parse(req.responseText).responseData.translatedText);
	   };
	   req.open("GET", svc, true);
	   req.send();
	}

	window.onload = function() {
	   hh = require("hiphop");
	   m = new hh.ReactiveMachine(
	      MODULE {
	   	 IN word;
	   	 OUT green, red, black, wiki, trans;
	   	 EVERY IMMEDIATE(NOW(word)) {
	   	    EMIT black(PREVAL(word));
	   	    EMIT red(VAL(word));
		    FORK {
	   	       EXECEMIT wiki searchWiki(VAL(word), DONEREACT);
		    } PAR {
		       EXECEMIT trans translate(VAL(word), DONEREACT);
		    }
	   	    EMIT green(VAL(word));
	   	 }
	      }
	   );

	   m.addEventListener("green", function(evt) {
	      var el = document.getElementById(evt.signalValue);
	      var wiki = document.getElementById("wiki");
	      var trans = document.getElementById("trans");
	      el.style.color = "green";
	      wiki.style.color = "green";
	      trans.style.color = "green";
	   });

	   m.addEventListener("black", function(evt) {
	      if (!evt.signalValue) {
		 return;
	      }
	      var el = document.getElementById(evt.signalValue);
	      el.style.color = "black";
	   });

	   m.addEventListener("red", function(evt) {
	      var el = document.getElementById(evt.signalValue);
	      var wiki = document.getElementById("wiki");
	      var trans = document.getElementById("trans");
	      el.style.color = "red";
	      wiki.style.color = "red";
	      trans.style.color = "red";
	   });

	   m.addEventListener("wiki", function(evt) {
	      var trans = document.getElementById("trans");
	      wiki.innerHTML = "<div>" + evt.signalValue + "</div>";
	   });

	   m.debuggerOn("debug");

	   var pre = document.getElementById("txt");
	   var file = ${getFile.resource("strcmp-manpage")}
	   ${getFile}(file).post(function(txt) {
	      let output = "";
	      let i = 0;

	      for (;i < txt.length;) {
		 while (txt[i] == " ") {
		    output += txt[i++];
		 }
		 output += "<span id='txt" + i +"'>";
		 while (txt[i] != " " && txt[i] != undefined) {
		    output += txt[i++];
		 }
		 output += "</span>";
	      }
	      pre.innerHTML = output;
	   });

	   pre.onclick = function() {
	      s = window.getSelection();
	      var node = s.anchorNode.parentNode;
	      if (node.id == "txt")
		 return;
	      m.inputAndReact("word", node.id);
	   };
	}

     }
     </head>
     <body>
       <pre id="txt"></pre>
       <div>wiki<div id="wiki"></div></div>
       <div>trans<div id="trans"><react>~{m.value.trans}</react></div></div>
     </body>
   </html>
}

service getFile(path) {
   return hop.HTTPResponseFile(path,
			       { contentType: "text/plain",
				 charset: hop.locale });
}


service wiki(word) {
   const srv = hop.webService("http://localhost:8181/" + word);
   return new Promise(function(resolve, reject) {
      srv().post(function(res) {
	 resolve(res);
      });
   })
   // return new Promise(function(resolve, reject) {
   //    wikipedia().page('Led Zeppelin').then(function(page) {
   // 	 page.html().then(function(res) {
   // 	    console.log(res)
   // 	 });
   //    });
   // });
}
