"use hopscript"

const path = require("path");
const dir = path.dirname(module.filename);

service validation() {
  return <html>
    <head css=${dir + "/styles.css"} module=${"hiphop"}>
    </head>
  ~{
     var m;

     window.onload = function() {
	const hh = require("hiphop");
	const prg = MODULE {
	   IN text;
	   OUT status, error;
	   LOOPEACH(NOW(text)) {
	      EMIT status("checking");
	      RUN(timeoutModule(500));
	      PROMISE status, error check(VAL(text));
	   }
	}

	m = new hh.ReactiveMachine(prg);
	console.log((new hh.ReactiveMachine(prg, {sweep:false})).stats());
	console.log(m.stats());

	function timeoutModule(ms) {
	   return MODULE {
	      EXEC setTimeout(DONEREACT, ms);
	   }
	}
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
