import { ReactiveMachine } from "@hop/hiphop";
import * as http from "http";
import * as https from "https";
import { parse } from "url";
import { timeout, Timeout } from "@hop/hiphop/modules/timeout.hh.js";

// the interface of the program, when a URL is fetched
// the "response" event is emitted
hiphop interface HttpRequest {
   out response;
}

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
	 res.content = "";
	 
	 // if the we have content to read
	 if (res.statusCode === 200) {
	    res.on('data', d => {
	       res.content += d.toString();
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

// Dealing with Redirection
hiphop module httpGetRedirection(URL, redirect) implements HttpRequest {
   signal rep;
   exit: loop {
      run httpGetOrchestration(URL) { rep as response };
      if (rep.nowval.statusCode === 301 && redirect <= 10) {
	 host {
	    URL = rep.nowval.headers.location;
	    redirect++;
	 }
      } else {
	 emit response(rep.nowval);
	 break exit;
      }
   }
}

hiphop module httpGetTimeout(URL,redirect) implements HttpRequest {
   signal Timeout;

   exit: fork {
      run httpGetRedirection(URL, redirect) { * };
      break exit;
   } par {
      run timeout(2000) { * };
      emit response({statusCode: 408});
      break exit;
   }
}
// prepare the HipHop machine 
const mach = new ReactiveMachine(httpGetTimeout);
// add a listener so that we see the result of the request
mach.addEventListener("response", v => {
   console.log("response=", v.nowval.content);
});

// initialize the machine
mach.init("https://www.inria.fr", 10);

// fetch the URL
mach.react();
