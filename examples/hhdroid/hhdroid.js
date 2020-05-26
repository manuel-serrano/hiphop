"use hiphop"
"use hopscript"

const hopdroid = require( hop.hopdroid );

const phone = new hopdroid.phone();

hiphop module Alarm( alarm, var minutes ) {
   weakabort( alarm.now ) {
      async alarm {
      	 this.intv = 
	    setTimeout( () => this.notify( true ),
	       1000 * 60 * minutes );
      }
   }
}

hiphop machine autoReply( in smsdelivered, smsreceived, autoreply = 0 ) {
   every( smsreceived.now && autoreply.nowval > 0 ) {
      let no = smsreceived.nowval[ 0 ];
      signal alarm;
      abort( smsdelivered.now && smsdelivered.nowval[ 0 ] === no ||
	     autoreply.now && autoreply.nowval === 0 ) {
	 run Alarm( minutes = autoreply.nowval );
	 hop { 
	    phone.sendSms( no, "I'm busy. I will answer as soon as I can" );
	    hop.broadcast( "autoreply", "delivered " + no );
	 }
      }
   }
}

autoReply.bindEvent( "smsreceived", phone );
autoReply.bindEvent( "smsdelivered", phone );

service hhdroid() {
   const con = <div/>;
   const del = <span>0</span>;
   return <html>
     <script>
       server.addEventListener( "autoreply", e => ${con}.innerHTML = e.value );
     </script>
     <h2>Phone: ${phone.model}</h2>
     ${del}
     <input id="delay" type="range" value=0 min=0 max=9 
	    onchange=~{${service (v) { autoReply.react( { autoreply: v } ); }}( this.value ).post();
		       ${del}.innerHTML = this.value}/> 
     <label for="delay">auto reply delay</label>
     ${con}
   </html>
}
