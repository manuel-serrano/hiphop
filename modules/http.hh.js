/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/http.hh.js            */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Tue Jan 11 18:12:15 2022                          */
/*    Last change :  Mon Jan 17 16:03:59 2022 (serrano)                */
/*    Copyright   :  2022 manuel serrano                               */
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

export { httpInterface, httpModule };

/*---------------------------------------------------------------------*/
/*    debug ...                                                        */
/*---------------------------------------------------------------------*/
function debug() {
   process.env.HIPHOP_DEBUG && process.env.HIPHOP_DEBUG.indexOf("http") >= 0;
}

/*---------------------------------------------------------------------*/
/*    httpInterface ...                                                */
/*---------------------------------------------------------------------*/
hiphop interface httpInterface {
   out result;
}

/*---------------------------------------------------------------------*/
/*    httpModuleBuilder ...                                            */
/*---------------------------------------------------------------------*/
hiphop module httpModule(options, protocol = "http", playload = undefined) implements httpInterface {
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
	    console.error("*** HIPHOP_DEBUG [" + options.path + "], statusCode: ", res.statusCode);
       	 }
       	 if (res.statusCode !== 200) {
	    self.notify(res);
       	 } else {
	    res.on('data', d => buf += d.toString());
	    res.on('end', () => {
	       res.buffer = buf;
	       
	       if (debug()) {
		  console.error("*** HIPHOP_DEBUG: [" + options.path + "], buf=[" + buf + "]");
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
	    console.error("*** HIPHOP_DEBUG [" + options.path + "], error: ", error);
       	 }
       	 if (state === "active") self.notify("error");
      });

      req.end();
   } suspend {
      state = "suspend";
   } resume {
      if (ended) {
       	 self.notify(res);
      }
   } kill {
      if (req) {
       	 req.destroy();
       	 req = false;
      }
   }
}
