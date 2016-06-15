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
	  <hh.sequence>

    <!-- watch / set-watch mode -->
	    <hh.emit signal="WATCH_MODE_COMMAND"/>
	    <hh.trap name="WATCH_AND_SET_WATCH_MODE">

    <!-- watch mode -->
              <hh.loop>
		<hh.sequence>
		  <hh.abort signal="UL">
		    <hh.parallel>
                      <hh.sequence>
			<hh.await signal="LL"/>
			<hh.exit trap="WATCH_AND_SET_WATCH_MODE"/>
                      </hh.sequence>
                      <hh.loop>
			<hh.sequence>
			  <hh.await signal="LR"/>
			  <hh.emit signal="TOGGLE_24H_MODE_COMMAND"/>
			</hh.sequence>
		      </hh.loop>
		    </hh.parallel>
		  </hh.abort>

<!-- set-watch mode -->
		  <hh.emit signal="ENTER_SET_WATCH_MODE_COMMAND"/>
		  <hh.abort signal="UL">
		    <hh.parallel>
                      <hh.loop>
			<hh.sequence>
			  <hh.await signal="LL"/>
			  <hh.emit signal="NEXT_WATCH_TIME_POSITION_COMMAND"/>
			</hh.sequence>
		      </hh.loop>
		      <hh.loop>
			<hh.sequence>
			  <hh.await signal="LR"/>
			  <hh.emit signal="SET_WATCH_COMMAND"/>
			</hh.sequence>
		      </hh.loop>
		    </hh.parallel>
		  </hh.abort>
		  <hh.emit signal="EXIT_SET_WATCH_MODE_COMMAND"/>
		</hh.sequence>
	      </hh.loop>
	    </hh.trap>

<!-- stopwatch mode -->
	    <hh.emit signal="STOPWATCH_MODE_COMMAND"/>
	    <hh.abort signal="LL">
              <hh.parallel>
		<hh.loop>
		  <hh.sequence>
		    <hh.await signal="LR"/>
		    <hh.emit signal="START_STOP_COMMAND"/>
		  </hh.sequence>
		</hh.loop>
		<hh.loop>
		  <hh.sequence>
		    <hh.await signal="UR"/>
		    <hh.emit signal="LAP_COMMAND"/>
		  </hh.sequence>
		</hh.loop>
              </hh.parallel>
	    </hh.abort>

<!-- alarm / set alarm mode -->
	    <hh.emit signal="ALARM_MODE_COMMAND"/>
	    <hh.trap name="ALARM_AND_SET_ALARM_MODE">
              <hh.loop>
		<hh.sequence>


<!-- alarm mode -->
		  <hh.abort signal="UL">
		    <hh.parallel>
		      <hh.parallel>
			<hh.sequence>
			  <hh.await signal="LL"/>
			  <hh.exit trap="ALARM_AND_SET_ALARM_MODE"/>
			</hh.sequence>
			<hh.loop> <hh.sequence>
			  <hh.await signal="LR"/>
			  <hh.emit signal="TOGGLE_CHIME_COMMAND"/>
				   </hh.sequence>
			</hh.loop>
		      </hh.parallel>
		      <hh.loop>
			<hh.sequence>
			  <hh.await signal="UR"/>
			  <hh.emit signal="TOGGLE_ALARM_COMMAND"/>
			</hh.sequence>
		      </hh.loop>
		    </hh.parallel>
		  </hh.abort>

<!-- set-alarm mode -->
		  <hh.emit signal="ENTER_SET_ALARM_MODE_COMMAND"/>
		  <hh.abort signal="UL">
		    <hh.parallel>
                      <hh.loop>
			<hh.sequence>
			  <hh.await signal="LL"/>
			  <hh.emit signal="NEXT_ALARM_TIME_POSITION_COMMAND"/>
			</hh.sequence>
		      </hh.loop>
		      <hh.loop>
			<hh.sequence>
			  <hh.await signal="LR"/>
			  <hh.emit signal="SET_ALARM_COMMAND"/>
			</hh.sequence>
		      </hh.loop>
		    </hh.parallel>
		  </hh.abort>
		  <hh.emit signal="EXIT_SET_ALARM_MODE_COMMAND"/>
		</hh.sequence>
	      </hh.loop>
	    </hh.trap>

	  </hh.sequence>
	</hh.loop>
	<hh.every signal="UR">
	  <hh.emit signal="STOP_ALARM_BEEP_COMMAND" />
	</hh.every>
      </hh.parallel>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(BUTTON, "BUTTON");
