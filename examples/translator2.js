"use hopscript"

service translator2() {
   return <html>
     <head module=${"hiphop"}>
       ~{
	  var hh;
	  var m;
	  var langpair = new hop.reactProxy({value: "fr|en"});
	  var trad, tradColor;
	  var tradReverse, tradReverseColor;

	  function reverseLangpair(langpair) {
	     let pair = langpair.split("|");
	     return pair[1] + "|" + pair[0];
	  }

	  window.onload = function() {
	     hh = require("hiphop");

	     function EXECCOLOR( attr, body ) {
		return <hh.sequence>
		  <hh.emit signal=${attr.color} value="red"/>
		  <hh.exec signal=${attr.out}
			   start=${function() {
			      let langpair = this.value.langpair;

			      if (attr.reverse != undefined) {
				 langpair = reverseLangpair(langpair);
			      }

			      var xhttp = new XMLHttpRequest();
			      var svc = "http://mymemory.translated.net/api/get";
			      var opt = "?langpair=" + langpair + "&q=" + this.value.in;

			      xhttp.onreadystatechange = function() {
				 if (xhttp.readyState == 4 && xhttp.status == 200) {
				    let res = JSON.parse(xhttp.responseText);
				    let trans = res.responseData.translatedText

				    this.returnAndReact(trans);
				 }
			      }.bind(this);
			      xhttp.open("GET", svc + opt, true);
			      xhttp.send();
			   }}/>
		  <hh.emit signal=${attr.color} value="blue"/>
		</hh.sequence>
	     }

	     m =  new hh.ReactiveMachine(
		<hh.module>
		  <hh.inputsignal name="in" combine=${(a, b) => b}/>
		  <hh.inputsignal name="langpair" value=${langpair.value}/>
		  <hh.outputsignal name="trad" value="??"/>
		  <hh.outputsignal name="tradColor" value="green"/>
                  <hh.outputsignal name="tradReverse" value="??"/>
		  <hh.outputsignal name="tradReverseColor" value="green"/>

		  <hh.await immediate signal="in"/>
		  <hh.loopeach signal="langpair">
		    <hh.loopeach signal="in">
		      <execColor out="trad" color="tradColor"/>
		      <execColor reverse out="tradReverse" color="tradReverseColor"/>
		    </hh.loopeach>
		  </hh.loopeach>
		</hh.module>
	     );

	     trad = m.reactProxy("trad");
	     tradColor = m.reactProxy("tradColor");
	     tradReverse = m.reactProxy("tradReverse");
	     tradReverseColor = m.reactProxy("tradReverseColor");
	  }
       }
     </head>
     <body>
       <select>
	 <option onclick=~{langpair.value="fr|en"}>fr|en</option>
	 <option onclick=~{langpair.value="fr|es"}>fr|es</option>
	 <react>~{m.inputAndReact("langpair", langpair.value)}</react>
       </select>
       <input type="text" oninput=~{m.inputAndReact("in", this.value)}/>

       <div style=~{`color: ${tradColor.value}`}>
	 <react>~{langpair.value}</react>: <react>~{trad.value}</react>
       </div>

       <div style=~{`color: ${tradReverseColor.value}`}>
	 <react>~{reverseLangpair(langpair.value)}</react>:
	 <react>~{tradReverse.value}</react>
       </div>
     </body>
   </html>;
}
