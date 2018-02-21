"use hopscript"

const hh = require("hiphop");

service translator() {
   return <html>
     <head module=${"hiphop"}>
     ~{
	var hh;
	var m;

	function translate(langPair, text) {
	   var req = new XMLHttpRequest();
	   var svc = "http://mymemory.translated.net/api/get?langpair=" + langPair + "&q=" + text;
	   return new Promise(function(resolve, reject) {
	      req.onreadystatechange = function() {
		 if (req.readyState == 4 && req.status == 200)
		    resolve(JSON.parse(req.responseText).responseData.translatedText);
	      };
	      req.open("GET", svc, true);
	      req.send();
	   });
	}

	function execColor(langPair) {
	   return MODULE (IN text, OUT color, OUT trans, OUT error) {
	      EMIT color("red");
	      AWAIT IMMEDIATE(NOW(text));
	      PROMISE trans, error translate(langPair, VAL(text));
	      EMIT color("green");
	   }
	}

        window.onload = function() {
	   hh = require("hiphop");
	   m = new hh.ReactiveMachine(MODULE (IN text,
					      OUT transEn, OUT colorEn,
					      OUT transNe, OUT colorNe,
					      OUT transEs, OUT colorEs,
					      OUT transSe, OUT colorSe){
	      LOOPEACH(NOW(text)) {
		 FORK {
		    RUN(execColor("fr|en"), color=colorEn, trans=transEn);
		 } PAR {
		    RUN(execColor("en|fr"), color=colorNe, text=transEn, trans=transNe);
		 } PAR {
		    RUN(execColor("fr|es"), color=colorEs, trans=transEs);
		 } PAR {
		    RUN(execColor("es|fr"), color=colorSe, text=transEs, trans=transSe);
		 }
	      }
	   }, {debuggerName: "debug"});
	}
     }
     </head>
     <style> * { font-size: 60px; color: black; }</style>
     <body>
       <input oninput=~{m.value.text = this.value}/>
       <div>
         <span style=~{`color: ${m.value.colorEn}`}>
           <react>~{m.value.transEn}</react>
         </span> -
         <span style=~{`color: ${m.value.colorNe}`}>
           <react>~{m.value.transNe}</react>
         </span>
       </div>
       <div>
         <span style=~{`color: ${m.value.colorEs}`}>
           <react>~{m.value.transEs}</react>
         </span> -
         <span style=~{`color: ${m.value.colorSe}`}>
           <react>~{m.value.transSe}</react>
         </span>
       </div>
     </body>
   </html>;
}
