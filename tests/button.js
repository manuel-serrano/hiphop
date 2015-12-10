"use hopscript"

function plus (x, y) { return x+y };

var rjs = require("hiphop");

var BUTTON =
    <rjs.reactivemachine debug name="BUTTON">
      <rjs.inputsignal name ="UL"/>
      <rjs.inputsignal name ="UR"/>
      <rjs.inputsignal name ="LL"/>
      <rjs.inputsignal name ="LR"/>
      <rjs.outputsignal name="WATCH_MODE_COMMAND"/>
      <rjs.outputsignal name="ENTER_SET_WATCH_MODE_COMMAND"/>
      <rjs.outputsignal name="SET_WATCH_COMMAND"/>
      <rjs.outputsignal name="NEXT_WATCH_TIME_POSITION_COMMAND"/>
      <rjs.outputsignal name="EXIT_SET_WATCH_MODE_COMMAND"/>
      <rjs.outputsignal name="TOGGLE_24H_MODE_COMMAND"/>
      <rjs.outputsignal name="TOGGLE_CHIME_COMMAND"/>
      <rjs.outputsignal name="STOPWATCH_MODE_COMMAND"/>
      <rjs.outputsignal name="START_STOP_COMMAND"/>
      <rjs.outputsignal name="LAP_COMMAND"/>
      <rjs.outputsignal name="ALARM_MODE_COMMAND"/>
      <rjs.outputsignal name="ENTER_SET_ALARM_MODE_COMMAND"/>
      <rjs.outputsignal name="SET_ALARM_COMMAND"/>
      <rjs.outputsignal name="NEXT_ALARM_TIME_POSITION_COMMAND"/>
      <rjs.outputsignal name="EXIT_SET_ALARM_MODE_COMMAND"/>
      <rjs.outputsignal name="TOGGLE_ALARM_COMMAND"/>
      <rjs.outputsignal name="STOP_ALARM_BEEP_COMMAND"/>

    <!-- global loop -->
      <rjs.parallel>
	<rjs.loop>
	  <rjs.sequence>

    <!-- watch / set-watch mode -->
	    <rjs.emit signal_name="WATCH_MODE_COMMAND"/>
	    <rjs.trap trap_name="WATCH_AND_SET_WATCH_MODE">

    <!-- watch mode -->
              <rjs.loop>
		<rjs.sequence>
		  <rjs.abort signal_name="UL">
		    <rjs.parallel>
                      <rjs.sequence>
			<rjs.await signal_name="LL"/>
			<rjs.exit trap_name="WATCH_AND_SET_WATCH_MODE"/>
                      </rjs.sequence>
                      <rjs.loop>
			<rjs.sequence>
			  <rjs.await signal_name="LR"/>
			  <rjs.emit signal_name="TOGGLE_24H_MODE_COMMAND"/>
			</rjs.sequence>
		      </rjs.loop>
		    </rjs.parallel>
		  </rjs.abort>

<!-- set-watch mode -->
		  <rjs.emit signal_name="ENTER_SET_WATCH_MODE_COMMAND"/>
		  <rjs.abort signal_name="UL">
		    <rjs.parallel>
                      <rjs.loop>
			<rjs.sequence>
			  <rjs.await signal_name="LL"/>
			  <rjs.emit signal_name="NEXT_WATCH_TIME_POSITION_COMMAND"/>
			</rjs.sequence>
		      </rjs.loop>
		      <rjs.loop>
			<rjs.sequence>
			  <rjs.await signal_name="LR"/>
			  <rjs.emit signal_name="SET_WATCH_COMMAND"/>
			</rjs.sequence>
		      </rjs.loop>
		    </rjs.parallel>
		  </rjs.abort>
		  <rjs.emit signal_name="EXIT_SET_WATCH_MODE_COMMAND"/>
		</rjs.sequence>
	      </rjs.loop>
	    </rjs.trap>

<!-- stopwatch mode -->
	    <rjs.emit signal_name="STOPWATCH_MODE_COMMAND"/>
	    <rjs.abort signal_name="LL">
              <rjs.parallel>
		<rjs.loop>
		  <rjs.sequence>
		    <rjs.await signal_name="LR"/>
		    <rjs.emit signal_name="START_STOP_COMMAND"/>
		  </rjs.sequence>
		</rjs.loop>
		<rjs.loop>
		  <rjs.sequence>
		    <rjs.await signal_name="UR"/>
		    <rjs.emit signal_name="LAP_COMMAND"/>
		  </rjs.sequence>
		</rjs.loop>
              </rjs.parallel>
	    </rjs.abort>

<!-- alarm / set alarm mode -->
	    <rjs.emit signal_name="ALARM_MODE_COMMAND"/>
	    <rjs.trap trap_name="ALARM_AND_SET_ALARM_MODE">
              <rjs.loop>
		<rjs.sequence>


<!-- alarm mode -->
		  <rjs.abort signal_name="UL">
		    <rjs.parallel>
		      <rjs.parallel>
			<rjs.sequence>
			  <rjs.await signal_name="LL"/>
			  <rjs.exit trap_name="ALARM_AND_SET_ALARM_MODE"/>
			</rjs.sequence>
			<rjs.loop> <rjs.sequence>
			  <rjs.await signal_name="LR"/>
			  <rjs.emit signal_name="TOGGLE_CHIME_COMMAND"/>
				   </rjs.sequence>
			</rjs.loop>
		      </rjs.parallel>
		      <rjs.loop>
			<rjs.sequence>
			  <rjs.await signal_name="UR"/>
			  <rjs.emit signal_name="TOGGLE_ALARM_COMMAND"/>
			</rjs.sequence>
		      </rjs.loop>
		    </rjs.parallel>
		  </rjs.abort>

<!-- set-alarm mode -->
		  <rjs.emit signal_name="ENTER_SET_ALARM_MODE_COMMAND"/>
		  <rjs.abort signal_name="UL">
		    <rjs.parallel>
                      <rjs.loop>
			<rjs.sequence>
			  <rjs.await signal_name="LL"/>
			  <rjs.emit signal_name="NEXT_ALARM_TIME_POSITION_COMMAND"/>
			</rjs.sequence>
		      </rjs.loop>
		      <rjs.loop>
			<rjs.sequence>
			  <rjs.await signal_name="LR"/>
			  <rjs.emit signal_name="SET_ALARM_COMMAND"/>
			</rjs.sequence>
		      </rjs.loop>
		    </rjs.parallel>
		  </rjs.abort>
		  <rjs.emit signal_name="EXIT_SET_ALARM_MODE_COMMAND"/>
		</rjs.sequence>
	      </rjs.loop>
	    </rjs.trap>

	  </rjs.sequence>
	</rjs.loop>
	<rjs.every signal_name="UR">
	  <rjs.emit signal_name="STOP_ALARM_BEEP_COMMAND" />
	</rjs.every>
      </rjs.parallel>
    </rjs.reactivemachine>;

exports.prg = BUTTON;
