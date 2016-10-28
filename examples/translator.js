"use hopscript"

const hh = require("hiphop");

service translator() {
   return <html>
     <head module=${"hiphop"}>
     ~{
	var hh;
	var m;
	var colorEnp;
        var transEnp;
        var colorPne;
        var transPne;
        var colorEsp;
        var transEsp;
        var colorPse;
        var transPse;

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

	function execColor(lang, _await=false) {
	   return <hh.module lang=${{initValue: lang}} color text trans>
		<hh.emit color value=${"red"}/>
		${_await ? <hh.await text/> : <hh.nothing/>}
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
		    <hh.run module=${execColor("en|fr", true)} color=colorNe text=transEn trans=transNe/>
		    <hh.run module=${execColor("fr|es")} color=colorEs trans=transEs/>
		    <hh.run module=${execColor("es|fr", true)} color=colorSe text=transEs trans=transSe/>
		  </hh.parallel>
		</hh.loopeach>
              </hh.module>);

	   colorEnp = m.reactProxy("colorEn");
           transEnp = m.reactProxy("transEn");
           colorPne = m.reactProxy("colorNe");
           transPne = m.reactProxy("transNe");
           colorEsp = m.reactProxy("colorEs");
           transEsp = m.reactProxy("transEs");
           colorPse = m.reactProxy("colorSe");
           transPse = m.reactProxy("transSe");
	}
     }
     </head>
     <style> * { font-size: 60px; color: black; }</style>
     <body>
       <input oninput=~{m.inputAndReact("text", this.value)}/>
       <div>
         <span style=~{`color: ${colorEnp.value}`}>
           <react>~{transEnp.value}</react>
         </span> -
         <span style=~{`color: ${colorPne.value}`}>
           <react>~{transPne.value}</react>
         </span>
       </div>
       <div>
         <span style=~{`color: ${colorEsp.value}`}>
           <react>~{transEsp.value}</react>
         </span> -
         <span style=~{`color: ${colorPse.value}`}>
           <react>~{transPse.value}</react>
         </span>
       </div>
     </body>
   </html>;
}
