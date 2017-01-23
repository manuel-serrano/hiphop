"use hopscript"

const hh = require("hiphop");

service translator() {
   return <html>
     <head module=${"hiphop"}>
     ~{
	var hh;
	var m;

	function translate() {
	   var req = new XMLHttpRequest();
	   var svc = "http://mymemory.translated.net/api/get?langpair=" + this.value.lang + "&q=" + this.value.text;
	   req.onreadystatechange = () => {
	      if (req.readyState == 4 && req.status == 200)
		 this.returnAndReact(JSON.parse(req.responseText).responseData.translatedText);
	   };
	   req.open("GET", svc, true);
	   req.send();
	}

	function execColor(lang) {
	   return <hh.module lang=${{initValue: lang}} color text trans>
		<hh.emit color value=${"red"}/>
	        <hh.await immediate text/>
		<hh.exec trans apply=${translate}/>
		<hh.emit color value=${"green"}/>
	     </hh.module>
	   }

        window.onload = function() {
	   hh = require("hiphop");
	   m = new hh.ReactiveMachine(
              <hh.module text transEn colorEn transNe colorNe transEs colorEs transSe colorSe>
		<hh.loopeach text>
		  <hh.parallel>
		    <hh.run module=${execColor("fr|en")} color=colorEn trans=transEn/>
		    <hh.run module=${execColor("en|fr")} color=colorNe text=transEn trans=transNe/>
		    <hh.run module=${execColor("fr|es")} color=colorEs trans=transEs/>
		    <hh.run module=${execColor("es|fr")} color=colorSe text=transEs trans=transSe/>
		  </hh.parallel>
		</hh.loopeach>
              </hh.module>);
	}
     }
     </head>
     <style> * { font-size: 60px; color: black; }</style>
     <body>
       <input oninput=~{m.text = this.value}/>
       <div>
         <span style=~{`color: ${m.colorEn}`}>
           <react>~{m.transEn}</react>
         </span> -
         <span style=~{`color: ${m.colorNe}`}>
           <react>~{m.transNe}</react>
         </span>
       </div>
       <div>
         <span style=~{`color: ${m.colorEs}`}>
           <react>~{m.transEs}</react>
         </span> -
         <span style=~{`color: ${m.colorSe}`}>
           <react>~{m.transSe}</react>
         </span>
       </div>
     </body>
   </html>;
}
