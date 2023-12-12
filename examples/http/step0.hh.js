import { ReactiveMachine } from "@hop/hiphop";
import * as http from "http";
import * as https from "https";
import { parse } from "url";

// the interface of the program, when a URL is fetched
// the "response" event is emitted
hiphop interface HttpRequest {
   out response;
}

// the main HipHop program
hiphop module step0(url) implements HttpRequest {
   let req = false;
   let self;

   // start an asynchronous form
   async (response) {
      let request = parse(URL.nowval);
      const proto = ((req.protocol === "https:") ? https : http);

      // spawns the JavaScript http request
      req = proto.request(request, res => {
	 // proceed to a new HipHop reaction with the signal
	 // "response" being emitted with the value "res"
	 self.notify(res)
      });
   }
}

// prepare the HipHop machine 
const mach = new ReactiveMachine(prg);
// add a listener so that we see the result of the request
mach.addEventListener("response", v => {
   console.log("response=", v.nowval.statusCode);
});

// initialize the machine
mach.init("https://www.inria.fr");

// fetch the URL
mach.react();
