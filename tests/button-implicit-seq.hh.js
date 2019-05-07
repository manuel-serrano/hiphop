"use hopscript"

var hh = require( "hiphop" );

function plus( x, y ) { return x+y };

hiphop module BUTTON( in UL, in UR, in LL, in LR,
		      out WATCH_MODE_COMMAND,
		      out ENTER_SET_WATCH_MODE_COMMAND,
		      out SET_WATCH_COMMAND,
		      out NEXT_WATCH_TIME_POSITION_COMMAND,
		      out EXIT_SET_WATCH_MODE_COMMAND,
		      out TOGGLE_24H_MODE_COMMAND,
		      out TOGGLE_CHIME_COMMAND,
		      out STOPWATCH_MODE_COMMAND,
		      out START_STOP_COMMAND,
		      out LAP_COMMAND,
		      out ALARM_MODE_COMMAND,
		      out ENTER_SET_ALARM_MODE_COMMAND,
		      out SET_ALARM_COMMAND,
		      out NEXT_ALARM_TIME_POSITION_COMMAND,
		      out TOGGLE_ALARM_COMMAND,
		      out STOP_ALARM_BEEP_COMMAND,
		      out EXIT_SET_ALARM_MODE_COMMAND ) {
   // global loop
   fork {
      loop {
	 // watch / set-watch mode
	 emit WATCH_MODE_COMMAND();
	 
	 WATCH_AND_SET_WATCH_MODE: loop {
	    // watch mode
	    abort( UL.now ) {
	       fork {
		  await( LL.now );
		  break WATCH_AND_SET_WATCH_MODE;
	       } par {
		  loop {
		     await( LR.now );
		     emit TOGGLE_24H_MODE_COMMAND();
		  }
	       }
	    }
	    
	    // set watch-mode
	    emit ENTER_SET_WATCH_MODE_COMMAND();
	    abort( UL.now ) {
	       fork {
		  loop {
		     await( LL.now );
		     emit NEXT_WATCH_TIME_POSITION_COMMAND();
		  }
	       } par {
		  loop {
		     await( LR.now );
		     emit SET_WATCH_COMMAND();
		  }
	       }
	    }
	    emit EXIT_SET_WATCH_MODE_COMMAND();
	 }
	 
	 // stopwatch mode
	 emit STOPWATCH_MODE_COMMAND();
	 abort( LL.now ) {
	    fork {
	       loop {
		  await( LR.now );
		  emit START_STOP_COMMAND();
	       }
	    } par {
	       loop {
		  await( UR.now );
		  emit LAP_COMMAND();
	       }
	    }
	 }
	 
	 // alarm / set alarm mode
	 emit ALARM_MODE_COMMAND();
	 ALARM_AND_SET_ALARM_MODE: loop {
	    // alarm mode
	    abort( UL.now ) {
	       fork {
		  fork {
		     await( LL.now );
		     break ALARM_AND_SET_ALARM_MODE;
		  } par {
		     loop {
			await( LR.now );
			emit TOGGLE_CHIME_COMMAND();
		     }
		  }
	       } par {
		  loop {
		     await( UR.now );
		     emit TOGGLE_ALARM_COMMAND();
		  }
	       }
	    }
	    
	    // set-alarm mode
	    emit ENTER_SET_ALARM_MODE_COMMAND();
	    abort( UL.now ) {
	       fork {
		  loop {
		     await( LL.now );
		     emit NEXT_ALARM_TIME_POSITION_COMMAND();
		  }
	       } par {
		  loop {
		     await( LR.now );
		     emit SET_ALARM_COMMAND();
		  }
	       }
	    }
	    emit EXIT_SET_ALARM_MODE_COMMAND();
	 }
      }
   } par {
      every( UR.now ) {
	 emit STOP_ALARM_BEEP_COMMAND();
      }
   }
}

exports.prg = new hh.ReactiveMachine( BUTTON, "BUTTON" );
