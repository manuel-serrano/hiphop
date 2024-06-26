import { ReactiveMachine } from "@hop/hiphop";
import * as http from "http";
import * as https from "https";
import { parse } from "url";

// the interface of the program, when a URL is fetched
// the "response" event is emitted
hiphop interface HttpRequest {
   out response;
}

// the HipHop program
hiphop module httpGet(URL) implements HttpRequest {
   let req = false;
   let self;

   // start an asynchronous form
   async (response) {
      self = this;
      let request = parse(URL);
      const proto = ((request.protocol === "https:") ? https : http);

      // spawns the JavaScript http request
      req = proto.request(request, res => {
	 // trigger a new HipHop reaction with the signal
	 // "response" being emitted with the value "res"
	 self.notify(res)
      });
      
      req.on('error', error => {
	 self.notify("error");
      });
      
      req.end();
   }
}

// prepare the HipHop machine 
const mach = new ReactiveMachine(httpGet);
// add a listener so that we see the result of the request
mach.addEventListener("response", v => {
   console.log("response=", v.nowval.statusCode);
});

// initialize the machine
mach.init("https://www.inria.fr");

// fetch the URL
mach.react();
