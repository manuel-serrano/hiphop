/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/http.hh.js            */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Tue Jan 11 18:12:15 2022                          */
/*    Last change :  Fri Sep 15 16:26:01 2023 (serrano)                */
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

export { request, HttpRequest };

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
/*    Http ...                                                         */
/*---------------------------------------------------------------------*/
hiphop interface HttpRequest {
   out result;
}

/*---------------------------------------------------------------------*/
/*    request ...                                                      */
/*---------------------------------------------------------------------*/
hiphop module request(protocol, options, payload = undefined) implements HttpRequest {
   let state = "active";
   let buf = "";
   let req = false;
   let ended = false;
   let res = undefined;
   let self;

   async (result) {
      const proto = (protocol === "https" ? https : http);
      self = this;
      req = proto.request(options, _res => {
       	 res = _res;
       	 if (debug()) {
	    console.error("*** HTTP_DEBUG [" + debug_url(protocol, options) + "]",
	       "statusCode: " + res.statusCode);
       	 }
       	 if (res.statusCode !== 200) {
	    self.notify(res);
       	 } else {
	    res.on('data', d => buf += d.toString());
	    res.on('end', () => {
	       res.buffer = buf;
	       
	       if (debug()) {
	    	  console.error("*** HTTP_DEBUG [" + debug_url(protocol, options) + "]",
		     "buf: [" + buf + "]");
	       }

	       if (state === "active") {
		  self.notify(res);
	       } else {
		  ended = true;
		  req = false;
	       };
	    });
       	 }
      });

      if (typeof(payload) === "string") {
       	 req.write(payload);
      } else if (typeof(payload) === "function") {
       	 req.write(payload());
      }

      req.on('error', error => {
       	 if (debug()) {
	    console.error("*** HTTP_DEBUG [" + debug_url(protocol, options) + "]",
	       "error: " + error);
	 }
       	 if (state === "active") self.notify("error");
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
