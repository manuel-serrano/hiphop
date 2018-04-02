const hh = require("hiphop");

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

module.exports = new hh.ReactiveMachine(MODULE (IN text,
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
}, {debuggerName: "debug", sweep: false});
