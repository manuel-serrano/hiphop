/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/http.hh.js            */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Tue Jan 11 18:12:15 2022                          */
/*    Last change :  Wed Jun 19 09:59:14 2024 (serrano)                */
/*    Copyright   :  2022-24 manuel serrano                            */
/*    -------------------------------------------------------------    */
/*    HTTP HipHop module.                                              */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    module                                                           */
/*---------------------------------------------------------------------*/
import * as http from "http";
import * as https from "https";
import { parse } from "url";

export { httpRequest, HttpRequest };

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
   let req = false;
   let ended = false;
   let self;
   
   async (response) {
      
      function run(request) {
	 const proto = ((request.protocol === "https:") ? https : http);
	 req = proto.request(request, res => {
	    res.content = "";
	    if (res.statusCode === 200) {
	       const contentLength = res.rawHeaders?.contentLength ?? Number.MAX_SAFE_INTEGER;
	       res.on('data', d => {
		  res.content += d.toString();
		  self.react({[pulse.signame]: res});

		  if (res.content.length >= contentLength) {
		     self.notify(res);
		     ended = true;
		     req = false;
		     state = "complete";
		  }
	       });
	       res.on('end', () => {
		  if (state === "active") {
		     state = "complete";
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
       	    if (state === "active") {
	       self.notify("error");
	    }
	 });

	 req.end();
      }

      self = this;
      let request, options;

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
