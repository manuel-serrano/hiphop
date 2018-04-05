"use hopscript"

service translator() {
   return <html>
     <head>
       <script src="hiphop" lang="hopscript"/>
       <script src="./trans-hh.js" lang="hiphop"/>
       <script defer>
	 var m = require("./trans-hh.js", "hiphop");
	 console.log(m);
       </script>
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
