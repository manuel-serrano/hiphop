"use hopscript"

const path = require("path");
const dir = path.dirname(module.filename);

service validation() {
  return <html>
    <head css=${dir + "/styles.css"}>
      <script src="hiphop" lang="hopscript"/>
      <script src="./form-validation-hh.js" lang="hiphop"/>
    </head>
  ~{
     const m;

     window.onload = function() {
	m = require("./form-validation-hh.js", "hiphop");
     }

     function check(data) {
	var req = new XMLHttpRequest();
	var svc = "http://localhost:8080/hop/checkSvc/";
	return new Promise(function(resolve, reject) {
	   req.onreadystatechange = function() {
              if (req.readyState == 4 && req.status == 200) {
		 resolve(req.responseText);
              }
	   }
	   req.open("GET", svc + "?data=" + data, true);
	   req.send();
	})
     }
  }
  <body>
    <input type="text"
	   class=~{m.value.status}
	   oninput=~{m.inputAndReact('text', this.value)}/>
  </body>
  </html>
}

service checkSvc(data) {
   console.log(data);
   if (data.data == "foo" || data.data == "bar") {
      return "right";
   } else {
      return "wrong";
   }
}
