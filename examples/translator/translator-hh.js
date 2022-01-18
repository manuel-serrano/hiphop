/*=====================================================================*/
/*    .../hiphop/hiphop/examples/translator/translator-hh.js           */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 01:01:22 2018                          */
/*    Last change :  Tue Jan 18 16:53:02 2022 (serrano)                */
/*    Copyright   :  2018-22 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    translator demo, client and hiphop parts.                        */
/*=====================================================================*/
"use @hop/hiphop";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    module                                                           */
/*---------------------------------------------------------------------*/
export { trans };
       
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
hiphop module execColor(langPair) {
   in text; 
   out color; 
   out trans;
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

/*---------------------------------------------------------------------*/
/*    trans ...                                                        */
/*---------------------------------------------------------------------*/
hiphop module trans() {
   in text;
   out transEn; out colorEn;
   out transNe; out colorNe;
   out transEs; out colorEs;
   out transSe; out colorSe;
      
   every (text.now) {
      fork {
	 run execColor("fr|en") { colorEn from color, transEn from trans, * };
      } par {
	 run execColor("en|fr") { colorNe from color, transEn to text, transNe from trans, * }
      } par {
	 run execColor("fr|es") { colorEs from color, transEs from trans, * };
      } par {
	 run execColor("es|fr") { colorSe from color, transEs to text, transSe from trans, * };
      }
   }
}
