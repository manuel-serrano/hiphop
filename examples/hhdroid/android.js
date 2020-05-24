"use hiphop"
"use hopscript"

const hopdroid = require( hop.hopdroid );

const phone = new hopdroid.phone();

hiphop module Alarm( alarm, minutes ) {
   async {
      this.intv = 
	 setTimeout( () => this.react( {[alarm.signame]: true} ), 
	    1000 * 60 * minutes );
   }
}

hiphop machine autoReply( in smsdelivered, smsreceived, autoreply ) {
   every( smsreceived.now && autoreply.nowval > 0 ) {
      let no = smsreceived.nowval[ 0 ];
      signal alarm;
      abort( smsdelivered.now && smsdelivered.nowval[ 0 ] === no ||
	     autoreply.now && autoreply.nowval === 0 ) {
	 fork {
	    run Alarm( alarm, minutes = autoreply.value );
	 } par {
	    await alarm.now;
	    hop { 
	       phone.smsSend( no, "I'm busy. I will answer as soon as I can" );
	       hop.broadcast( "autoreply", no );
 	    }
	 }
      }
   }
}

autoReply.bindEvent( "smsdelivered", phone );
autoReply.bindEvent( "smsreceived", phone );

service android() {
   const con = <div/>;
   return <html>
     <script>
       server.addEventListener( "autoreply", e => ${con}.innerHTML = e.value );
     </script>
     <input id="autoreply"
	    type=checkbox 
	    onclick=~{
	       ${service (v) { mach.react( { autoreply: v } ) }}( this.value ? dom.getElementById( delay ).value : 0 ).post() }/>
     <label for="autoreply">delay</label>
     <input id="delay" type=range min=1 max=10/> 
     <label for="delay">delay</label>
     ${ con }
   </html>
}
