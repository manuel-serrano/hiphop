"use hopscript"

function plus (x, y) { return x+y };

var hh = require("hiphop");

var BUTTON =
    <hh.module>
      <hh.inputsignal name ="UL"/>
      <hh.inputsignal name ="UR"/>
      <hh.inputsignal name ="LL"/>
      <hh.inputsignal name ="LR"/>
      <hh.outputsignal name="WATCH_MODE_COMMAND"/>
      <hh.outputsignal name="ENTER_SET_WATCH_MODE_COMMAND"/>
      <hh.outputsignal name="SET_WATCH_COMMAND"/>
      <hh.outputsignal name="NEXT_WATCH_TIME_POSITION_COMMAND"/>
      <hh.outputsignal name="EXIT_SET_WATCH_MODE_COMMAND"/>
      <hh.outputsignal name="TOGGLE_24H_MODE_COMMAND"/>
      <hh.outputsignal name="TOGGLE_CHIME_COMMAND"/>
      <hh.outputsignal name="STOPWATCH_MODE_COMMAND"/>
      <hh.outputsignal name="START_STOP_COMMAND"/>
      <hh.outputsignal name="LAP_COMMAND"/>
      <hh.outputsignal name="ALARM_MODE_COMMAND"/>
      <hh.outputsignal name="ENTER_SET_ALARM_MODE_COMMAND"/>
      <hh.outputsignal name="SET_ALARM_COMMAND"/>
      <hh.outputsignal name="NEXT_ALARM_TIME_POSITION_COMMAND"/>
      <hh.outputsignal name="EXIT_SET_ALARM_MODE_COMMAND"/>
      <hh.outputsignal name="TOGGLE_ALARM_COMMAND"/>
      <hh.outputsignal name="STOP_ALARM_BEEP_COMMAND"/>

    <!-- global loop -->
      <hh.parallel>
	<hh.loop>
    <!-- watch / set-watch mode -->
	  <hh.emit signal_name="WATCH_MODE_COMMAND"/>
	  <hh.trap trap_name="WATCH_AND_SET_WATCH_MODE">
    <!-- watch mode -->
            <hh.loop>
	      <hh.abort signal_name="UL">
		<hh.parallel>
                  <hh.sequence>
		    <hh.await signal_name="LL"/>
		    <hh.exit trap_name="WATCH_AND_SET_WATCH_MODE"/>
                  </hh.sequence>
                  <hh.loop>
		    <hh.await signal_name="LR"/>
		    <hh.emit signal_name="TOGGLE_24H_MODE_COMMAND"/>
		  </hh.loop>
		</hh.parallel>
	      </hh.abort>
<!-- set-watch mode -->
	      <hh.emit signal_name="ENTER_SET_WATCH_MODE_COMMAND"/>
	      <hh.abort signal_name="UL">
		<hh.parallel>
                  <hh.loop>
		    <hh.await signal_name="LL"/>
		    <hh.emit signal_name="NEXT_WATCH_TIME_POSITION_COMMAND"/>
		  </hh.loop>
		  <hh.loop>
		    <hh.await signal_name="LR"/>
		    <hh.emit signal_name="SET_WATCH_COMMAND"/>
		  </hh.loop>
		</hh.parallel>
	      </hh.abort>
	      <hh.emit signal_name="EXIT_SET_WATCH_MODE_COMMAND"/>
	    </hh.loop>
	  </hh.trap>
<!-- stopwatch mode -->
	  <hh.emit signal_name="STOPWATCH_MODE_COMMAND"/>
	  <hh.abort signal_name="LL">
            <hh.parallel>
	      <hh.loop>
		<hh.await signal_name="LR"/>
		<hh.emit signal_name="START_STOP_COMMAND"/>
	      </hh.loop>
	      <hh.loop>
		<hh.await signal_name="UR"/>
		<hh.emit signal_name="LAP_COMMAND"/>
	      </hh.loop>
            </hh.parallel>
	  </hh.abort>
<!-- alarm / set alarm mode -->
	  <hh.emit signal_name="ALARM_MODE_COMMAND"/>
	  <hh.trap trap_name="ALARM_AND_SET_ALARM_MODE">
            <hh.loop>
<!-- alarm mode -->
	      <hh.abort signal_name="UL">
		<hh.parallel>
		  <hh.parallel>
		    <hh.sequence>
		      <hh.await signal_name="LL"/>
		      <hh.exit trap_name="ALARM_AND_SET_ALARM_MODE"/>
		    </hh.sequence>
		    <hh.loop>
		      <hh.await signal_name="LR"/>
		      <hh.emit signal_name="TOGGLE_CHIME_COMMAND"/>
		    </hh.loop>
		  </hh.parallel>
		  <hh.loop>
		    <hh.await signal_name="UR"/>
		    <hh.emit signal_name="TOGGLE_ALARM_COMMAND"/>
		  </hh.loop>
		</hh.parallel>
	      </hh.abort>
<!-- set-alarm mode -->
	      <hh.emit signal_name="ENTER_SET_ALARM_MODE_COMMAND"/>
	      <hh.abort signal_name="UL">
		<hh.parallel>
                  <hh.loop>
		    <hh.await signal_name="LL"/>
		    <hh.emit signal_name="NEXT_ALARM_TIME_POSITION_COMMAND"/>
		  </hh.loop>
		  <hh.loop>
		    <hh.await signal_name="LR"/>
		    <hh.emit signal_name="SET_ALARM_COMMAND"/>
		  </hh.loop>
		</hh.parallel>
	      </hh.abort>
	      <hh.emit signal_name="EXIT_SET_ALARM_MODE_COMMAND"/>
	    </hh.loop>
	  </hh.trap>
	</hh.loop>
	<hh.every signal_name="UR">
	  <hh.emit signal_name="STOP_ALARM_BEEP_COMMAND" />
	</hh.every>
      </hh.parallel>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(BUTTON, "BUTTON");
