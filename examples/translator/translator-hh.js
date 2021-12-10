/*=====================================================================*/
/*    .../hiphop/hiphop/examples/translator/translator-hh.js           */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 01:01:22 2018                          */
/*    Last change :  Fri Dec 10 18:32:53 2021 (serrano)                */
/*    Copyright   :  2018-21 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    translator demo, client and hiphop parts.                        */
/*=====================================================================*/
"use hiphop";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
const hh = require("hiphop");

/*---------------------------------------------------------------------*/
/*    constant                                                         */
/*---------------------------------------------------------------------*/
const mymemory = "http://mymemory.translated.net/api/get";

/*---------------------------------------------------------------------*/
/*    translate                                                        */
/*    -------------------------------------------------------------    */
/*    For the sake of the example, this demo does not use builtin      */
/*    Hop services. It uses plain xmlhttprequests instead.             */
/*---------------------------------------------------------------------*/
function translate(langPair, text) {
   const req = new XMLHttpRequest();
   const svc = mymemory + "?langpair=" + langPair + "&q=" + text;

   return new Promise((resolve, reject) => {
      req.onreadystatechange = () => {
	 if (req.readyState === 4) {
	    if (req.status === 200) {
	       const txt = JSON.parse(req.responseText)
		     .responseData
		     .translatedText;

	       // mymemory sometime returns "&" instead of the translation
	       if (txt != "&") {
		  resolve(txt);
	       } else {
		  reject(txt);
	       }
	    } else {
	       reject(txt);
	    }
	 }
      };
      req.open("GET", svc, true);
      req.send();
   });
}

/*---------------------------------------------------------------------*/
/*    execColor ...                                                    */
/*---------------------------------------------------------------------*/
function execColor(langPair) {
   return hiphop module(in text, out color, out trans) {
      signal result;
      
      emit color("red");
      await immediate(text.now);
      
      async (result) {
	 this.notify(translate(langPair, text.nowval));
      }

      if (result.nowval.resolve) {
	 emit trans(result.nowval.val);
	 emit color("green");
      } else {
	 emit color("orange");
      }
   }
}

/*---------------------------------------------------------------------*/
/*    trans ...                                                        */
/*---------------------------------------------------------------------*/
hiphop module trans(in text,
		     out transEn, out colorEn,
		     out transNe, out colorNe,
		     out transEs, out colorEs,
		     out transSe, out colorSe) {
   every (text.now) {
      fork {
	 run ${execColor("fr|en")}(colorEn => color, transEn => trans, ...);
      } par {
	 run ${execColor("en|fr")}(colorNe => color, transEn => text, transNe => trans, ...);
      } par {
	 run ${execColor("fr|es")}(colorEs => color, transEs => trans, ...);
      } par {
	 run ${execColor("es|fr")}(colorSe => color, transEs => text, transSe => trans, ...);
      }
   }
}


module.exports = trans;
