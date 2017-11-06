"use hopscript"

const hh = require("hiphop");

service translator() {
   return <html>
     <head module=${"hiphop"}>
     ~{
	var hh;
	var m;

	function translate(lang, text, doneReact) {
	   var req = new XMLHttpRequest();
	   var svc = "http://mymemory.translated.net/api/get?langpair=" + lang + "&q=" + text;
	   req.onreadystatechange = function() {
	      if (req.readyState == 4 && req.status == 200)
		 doneReact(JSON.parse(req.responseText).responseData.translatedText);
	   };
	   req.open("GET", svc, true);
	   req.send();
	}

	function execColor(l) {
	   return MODULE {
	      IN lang(l), text;
	      OUT color, trans;
	      EMIT color("red");
	      AWAIT IMMEDIATE(NOW(text));
	      EXECEMIT trans translate(VAL(lang), VAL(text), DONEREACT);
	      EMIT color("green");
	   }
	}

        window.onload = function() {
	   hh = require("hiphop");
	   m = new hh.ReactiveMachine(MODULE {
	      IN text;
	      OUT transEn, colorEn, transNe, colorNe, transEs, colorEs, transSe, colorSe;
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
	   });
	   m.debuggerOn("debug");
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
