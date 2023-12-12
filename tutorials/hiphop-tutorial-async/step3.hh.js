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
hiphop module httpGetOrchestration(URL) implements HttpRequest {
   let req = false;
   let self;
   let state = "active";

   // start an asynchronous form
   async (response) {
      self = this;
      let request = parse(URL);
      const proto = ((request.protocol === "https:") ? https : http);

      // spawns the JavaScript http request
      req = proto.request(request, res => {
	 // if the we have content to read
	 if (res.statusCode === 200) {
	    res.on('data', d => {
	       res.buffer += d.toString();
	    });
	    res.on('end', () => {
	       if (state === "active") {
		  self.notify(res);
	       }
	    });
       	 } else {
	    // notify the status code
	    self.notify(res);
	 }
      });

      req.on('error', error => {
       	 if (state === "active") {
	    self.notify("error");
	 }
      });

     req.end();
   }
   } suspend {
      state = "suspend";
   } resume {
      if (ended) {
       	 self.notify(res);
      } else {
	 state = "active";
      }
   } kill {
      if (req) {
       	 req.destroy();
       	 req = false;
	 state = "dead";
      }
   }
   
}

// prepare the HipHop machine 
const mach = new ReactiveMachine(httpGetOrchestration);
// add a listener so that we see the result of the request
mach.addEventListener("response", v => {
   console.log("response=", v.nowval.statusCode);
});

// initialize the machine
mach.init("https://www.inria.fr");

// fetch the URL
mach.react();
