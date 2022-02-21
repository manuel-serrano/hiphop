"use @hop/hiphop";
"use hopscript";

import { Phone } from "hop:hopdroid";

const phone = new Phone();

hiphop module Alarm(minutes) {
   out alarm;
   
   weakabort (alarm.now) {
      async (alarm) {
      	 this.intv = 
	    setTimeout(() => this.notify(true),
	       1000 * 60 * minutes);
      }
   }
}

hiphop machine autoReply() {
   in smsdelivered;
   in smsreceived;
   in autoreply = 0;
      
   every (smsreceived.now && autoreply.nowval > 0) {
      let no = smsreceived.nowval[0];

      host { 
	 console.log("smsecv:", 
	    no + ", waiting", autoreply.nowval + "m before autoreply...");
      }
      
      abort (smsdelivered.now && smsdelivered.nowval[0] === no ||
	     autoreply.now && autoreply.nowval === 0) {
	 run Alarm(autoreply.nowval) {};
	 host { 
	    phone.sendSms(no, "I'm busy. I will answer as soon as I can");
	    hop.broadcast("autoreply", "delivered " + no);
	 }
      }
   }
}

autoReply.bindEvent("smsreceived", phone);
autoReply.bindEvent("smsdelivered", phone);

service hhdroid() {
   const con = <div/>;
   const del = <span>0</span>;
   return <html>
     <script>
       server.addEventListener("autoreply", e => ${con}.innerHTML = e.value);
     </script>
     <h2>Phone: ${phone.model}</h2>
     ${del}
     <input id="delay" type="range" value=0 min=0 max=9 
	    onchange=~{${service (v) { autoReply.react({ autoreply: v }); }}(this.value).post();
		       ${del}.innerHTML = this.value}/> 
     <label for="delay">auto reply delay</label>
     ${con}
   </html>
}
