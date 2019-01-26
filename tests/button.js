"use hopscript"

function plus (x, y) { return x+y };

var hh = require("hiphop");

var sigIn={accessibility: hh.IN};
var sigOut={accessibility: hh.OUT};

var BUTTON =
    <hh.module UL=${sigIn} UR=${sigIn} LL=${sigIn} LR=${sigIn}
	       WATCH_MODE_COMMAND=${sigOut}
	       ENTER_SET_WATCH_MODE_COMMAND=${sigOut}
	       SET_WATCH_COMMAND=${sigOut}
	       NEXT_WATCH_TIME_POSITION_COMMAND=${sigOut}
	       EXIT_SET_WATCH_MODE_COMMAND=${sigOut}
	       TOGGLE_24H_MODE_COMMAND=${sigOut}
	       TOGGLE_CHIME_COMMAND=${sigOut}
	       STOPWATCH_MODE_COMMAND=${sigOut}
	       START_STOP_COMMAND=${sigOut}
	       LAP_COMMAND=${sigOut}
	       ALARM_MODE_COMMAND=${sigOut}
	       ENTER_SET_ALARM_MODE_COMMAND=${sigOut}
	       SET_ALARM_COMMAND=${sigOut}
	       NEXT_ALARM_TIME_POSITION_COMMAND=${sigOut}
	       TOGGLE_ALARM_COMMAND=${sigOut}
	       STOP_ALARM_BEEP_COMMAND=${sigOut}
	       EXIT_SET_ALARM_MODE_COMMAND=${sigOut}>

    <!-- global loop -->
      <hh.parallel>
	<hh.loop>
	  <hh.sequence>

    <!-- watch / set-watch mode -->
	    <hh.emit WATCH_MODE_COMMAND/>
	    <hh.trap WATCH_AND_SET_WATCH_MODE>

    <!-- watch mode -->
              <hh.loop>
		<hh.sequence>
		  <hh.abort UL>
		    <hh.parallel>
                      <hh.sequence>
			<hh.await LL/>
			<hh.exit WATCH_AND_SET_WATCH_MODE/>
                      </hh.sequence>
                      <hh.loop>
			<hh.sequence>
			  <hh.await LR/>
			  <hh.emit TOGGLE_24H_MODE_COMMAND/>
			</hh.sequence>
		      </hh.loop>
		    </hh.parallel>
		  </hh.abort>

<!-- set-watch mode -->
		  <hh.emit ENTER_SET_WATCH_MODE_COMMAND/>
		  <hh.abort UL>
		    <hh.parallel>
                      <hh.loop>
			<hh.sequence>
			  <hh.await LL/>
			  <hh.emit NEXT_WATCH_TIME_POSITION_COMMAND/>
			</hh.sequence>
		      </hh.loop>
		      <hh.loop>
			<hh.sequence>
			  <hh.await LR/>
			  <hh.emit SET_WATCH_COMMAND/>
			</hh.sequence>
		      </hh.loop>
		    </hh.parallel>
		  </hh.abort>
		  <hh.emit EXIT_SET_WATCH_MODE_COMMAND/>
		</hh.sequence>
	      </hh.loop>
	    </hh.trap>

<!-- stopwatch mode -->
	    <hh.emit STOPWATCH_MODE_COMMAND/>
	    <hh.abort LL>
              <hh.parallel>
		<hh.loop>
		  <hh.sequence>
		    <hh.await LR/>
		    <hh.emit START_STOP_COMMAND/>
		  </hh.sequence>
		</hh.loop>
		<hh.loop>
		  <hh.sequence>
		    <hh.await UR/>
		    <hh.emit LAP_COMMAND/>
		  </hh.sequence>
		</hh.loop>
              </hh.parallel>
	    </hh.abort>

<!-- alarm / set alarm mode -->
	    <hh.emit ALARM_MODE_COMMAND/>
	    <hh.trap ALARM_AND_SET_ALARM_MODE>
              <hh.loop>
		<hh.sequence>


<!-- alarm mode -->
		  <hh.abort UL>
		    <hh.parallel>
		      <hh.parallel>
			<hh.sequence>
			  <hh.await LL/>
			  <hh.exit ALARM_AND_SET_ALARM_MODE/>
			</hh.sequence>
			<hh.loop> <hh.sequence>
			  <hh.await LR/>
			    <hh.emit TOGGLE_CHIME_COMMAND/>
			  </hh.sequence>
			</hh.loop>
		      </hh.parallel>
		      <hh.loop>
			<hh.sequence>
			  <hh.await UR/>
			  <hh.emit TOGGLE_ALARM_COMMAND/>
			</hh.sequence>
		      </hh.loop>
		    </hh.parallel>
		  </hh.abort>

<!-- set-alarm mode -->
		  <hh.emit ENTER_SET_ALARM_MODE_COMMAND/>
		  <hh.abort UL>
		    <hh.parallel>
                      <hh.loop>
			<hh.sequence>
			  <hh.await LL/>
			  <hh.emit NEXT_ALARM_TIME_POSITION_COMMAND/>
			</hh.sequence>
		      </hh.loop>
		      <hh.loop>
			<hh.sequence>
			  <hh.await LR/>
			  <hh.emit SET_ALARM_COMMAND/>
			</hh.sequence>
		      </hh.loop>
		    </hh.parallel>
		  </hh.abort>
		  <hh.emit EXIT_SET_ALARM_MODE_COMMAND/>
		</hh.sequence>
	      </hh.loop>
	    </hh.trap>

	  </hh.sequence>
	</hh.loop>
	<hh.every UR>
	  <hh.emit STOP_ALARM_BEEP_COMMAND/>
	</hh.every>
      </hh.parallel>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(BUTTON, "BUTTON");
