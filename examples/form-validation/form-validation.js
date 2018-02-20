"use hopscript"

const path = require("path");
const dir = path.dirname(module.filename);

service validation() {
  return <html>
  <head css=${dir + "/styles.css"}>
  </head>
  ~{
     let form;
     let reqId = 0;

     window.onload = function() {
	form = document.getElementById("form");
	form.className = "wrong";
	form.addEventListener("input", function() {
	   let curReqId = ++reqId;
           form.className = "checking";
	   check(form.value, function(res) {
	      setTimeout(function() {
		 if (curReqId != reqId) {
		    return;
		 }
		 form.className = res;
	      }, Math.round(Math.random() * 1000));
	   });
	});
     }

     function check(data, callback) {
	var req = new XMLHttpRequest();
	var svc = "http://localhost:8080/hop/checkSvc/";
	req.onreadystatechange = function() {
           if (req.readyState == 4 && req.status == 200) {
	      callback(req.responseText);
           }
	};
	req.open("GET", svc + "?data=" + data, true);
	req.send();
     }
  }
  <body>
    <input type="text" id="form"/>
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
