/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/modules/http.hh.js             */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Tue Jan 11 18:12:15 2022                          */
/*    Last change :  Mon Dec 11 20:15:22 2023 (serrano)                */
/*    Copyright   :  2022-23 manuel serrano                            */
/*    -------------------------------------------------------------    */
/*    HTTP HipHop module.                                              */
/*=====================================================================*/
"use @hop/hiphop";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    module                                                           */
/*---------------------------------------------------------------------*/
import * as http from "http";
import * as https from "https";
import { parse } from "url";

export { httpRequest, HttpRequest };

/*---------------------------------------------------------------------*/
/*    debug ...                                                        */
/*---------------------------------------------------------------------*/
function debug() {
   return process.env.HIPHOP_DEBUG && process.env.HIPHOP_DEBUG.indexOf("http") >= 0;
}

/*---------------------------------------------------------------------*/
/*    debug_url ...                                                    */
/*---------------------------------------------------------------------*/
function debug_url(protocol, options) {
   return protocol + "://" + options.hostname
      + ":" + (options.port || 80)
      +  options.path;
}

/*---------------------------------------------------------------------*/
/*    HttpRequest ...                                                  */
/*---------------------------------------------------------------------*/
hiphop interface HttpRequest {
   out response;
   inout pulse;
}

/*---------------------------------------------------------------------*/
/*    request ...                                                      */
/*---------------------------------------------------------------------*/
hiphop module httpRequest(requestOrUrl, optionsOrPayload = undefined, payload = undefined) implements HttpRequest {
   // the call might be one of:
   //   url: string
   //   url: string, options: object
   //   url: string, payload: string
   //   url: string, options: object, payload: string
   //   request: object
   //   request: object, options: object
   //   request: object, payload: string
   //   request: object, options: object, payload: string
   
   let state = "active";
   let buf = "";
   let req = false;
   let ended = false;
   let self;
   
   async (response) {
      let request, options;
      self = this;
      buf = "";

      // request
      switch (typeof requestOrUrl) {
	 case "string": request = parse(requestOrUrl); break; 
	 case "object": request = requestOrUrl; break;
	 default: throw `httpRequest, bad requestOrUrl argument "${requestOrUrl}"`
      }

      // options
      switch (typeof optionsOrPayload) {
	 case "object": options = optionsOrPayload; break;
	 case "string": options = {}; payload = optionsOrPayload; break;
	 case "function": options = optionsOrPayload(); break;
	 case "undefined": options = {}; break;
	 default: throw `httpRequest, bad optionsOrPayload argument "${optionsOrPayload}"`
      }

      // payload
      switch (typeof payload) {
	 case "string":
	    if (typeof payload !== "undefined") {
	       throw `httpRequest, bad options/payload arguments "${optionsOrPayload}/${payload}"`
	    }
	 case "function":
	    if (typeof payload !== "undefined") {
	       throw `httpRequest, bad options/payload arguments "${optionsOrPayload}/${payload}"`
	    } else {
	       payload = payload();
	    }
	    break;
	 case "undefined":
	    break;
	 default:
	    throw `httpRequest, bad payload argument "${payload}"`;
      }

      function run(request) {
	 const proto = ((request.protocol === "https:") ? https : http);
	 req = proto.request(request, res => {
       	    if (debug()) {
	       console.error("*** HTTP_DEBUG ["
		  + debug_url(request?.protocol ?? "http", request) + "]",
			     "statusCode: " + res.statusCode);
       	    }
	    
	    if (res.statusCode === 200) {
	       res.on('data', d => {
		  res.buffer += d.toString();
		  self.react({[pulse.signame]: res});
		  //self.notify(res);
	       });
	       res.on('end', () => {
		  if (debug()) {
	    	     console.error("*** HTTP_DEBUG ["
			+ debug_url(request?.protocol ?? "http", request) + "]",
				   "buf: [" + res.buffer + "]");
		  }

		  if (state === "active") {
		     self.notify(res);
		  } else {
		     ended = true;
		     req = false;
		  };
	       });
       	    } else {
	       self.notify(res);
	    }
	 });

	 if (typeof(payload) !== "undefined") {
       	    req.write(payload);
	 }

	 req.on('error', error => {
       	    if (debug()) {
	       console.error("*** HTTP_DEBUG ["
		  + debug_url(request?.protocol ?? "http", request) + "]",
			     "error: " + error);
	    }
       	    if (state === "active") self.notify("error");
	 });

	 req.end();
      }

      run(request);
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
