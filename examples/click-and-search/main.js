"use hopscript"

const debug = require("hiphop");

service clickAndSearch() {
   return <html>
     <head css=${clickAndSearch.resource("./style.css")}>
       <script src="hiphop" lang="hopscript"></script>
       <script src="./main-hh.js" lang="hiphop"></script >
       <script defer>
     ~{
	var hh = require("hiphop", "hopscript");
	var m = require("./main-hh.js", "hiphop")(searchWiki, translate)

	function searchWiki(wordId) {
	   var word = document.getElementById(wordId).innerHTML;
	   return new Promise((res, rej) => (
	      ${wiki}(word).post(r => res(r))
	   ));
	}

	function translate(wordId) {
	   var word = document.getElementById(wordId).innerHTML;
	   var req = new XMLHttpRequest();
	   var svc = "http://mymemory.translated.net/api/get?langpair=en|fr&q=" + word;
	   return new Promise((res, rej) => {
	      req.onreadystatechange = () => {
		 if (req.readyState == 4 && req.status == 200)
		    res(JSON.parse(req.responseText).responseData.translatedText);
	      };
	      req.open("GET", svc, true);
	      req.send();
	   });
	}

	m.addEventListener("green", function(evt) {
	   var el = document.getElementById(evt.signalValue);
	   el.style.color = "green";
	   var popup = document.getElementById("popup").style.display = "block";
	});

	m.addEventListener("black", function(evt) {
	   if (!evt.signalValue) {
	      return;
	   }
	   var el = document.getElementById(evt.signalValue);
	   el.style.color = "black";

	   var popup = document.getElementById("popup").style.display = "none";
	});

	m.addEventListener("red", function(evt) {
	   var el = document.getElementById(evt.signalValue);
	   el.style.color = "red";
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
	 </script>
       </head>
       <body>
	 <div id="popup">
	   <div id="trans"><react>~{m.value.trans}</react></div>
	   <div id="wiki"></div>
	 </div>
	 <pre id="txt"></pre>
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
}
