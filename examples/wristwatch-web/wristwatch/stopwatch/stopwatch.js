"use hopscript"

// Import data files and define hiphop evaluator
//==============================================

var TD = require ("../data/time-data.js");
var BD = require ("../data/beep-data.js");
var SD = require ("./stopwatch-data.js");

function Ici () {console.log("Ici " + SD.InitialStopwatchTime);}
function La () {console.log("La " + SD.InitialStopwatchTime);}

var hh = require("hiphop");
exports.hh = hh;

// The BASIC_STOPWATCH hiphop code
//================================

var BasicStopwatchModule =
    <hh.module>
      
      // Basic stopwatch I/Os
      //---------------------
      
      <hh.inputsignal name="HS"/>
      <hh.inputsignal name="START_STOP_COMMAND"/>
      
      <hh.outputsignal name="STOPWATCH_TIME"
		       init_value=${SD.InitialStopwatchTime}/>
      <hh.outputsignal name="STOPWATCH_RUN_STATUS" init_value=${false}/>
      <hh.outputsignal name="BEEP" init_value=${BD.NoBeep}/>
      
      // Basic stopwatch reactive code
      //------------------------------

      // initialization, emit initial zero time
	
      <hh.emit signal_name="STOPWATCH_TIME" arg0=${SD.InitialStopwatchTime}/>
      <hh.atom func=${Ici}/>
      
      // loop between off and on
      
      <hh.loop>
	
	// idle mode
	
	<hh.emit signal_name="STOPWATCH_RUN_STATUS" arg0=${false}/>
	<hh.await signal_name="START_STOP_COMMAND"/>
	
        // start the stopwatch
	
        <hh.emit signal_name="STOPWATCH_RUN_STATUS" arg0=${true}/>
	<hh.emit signal_name="BEEP" arg0=${BD.Stopwatch_NumberOfBeepsPerSecond}/>
	
	// time counting mode
	
	<hh.abort signal_name="START_STOP_COMMAND">
	  <hh.every signal_name="HS">
	    <hh.emit signal_name="STOPWATCH_TIME"
		     func=${SD.IncrementStopwatchTime}
		     arg0=${hh.preValue("STOPWATCH_TIME")}/>
	    <hh.atom func=${La}/>
	    <hh.emit signal_name="BEEP"
		     func=${SD.StopwatchBeep}
		     arg0=${hh.value("STOPWATCH_TIME")}/>
	  </hh.every>
	</hh.abort>
	
	// changing the status, beeping when the stopwatch stops, and back to idle mode
        <hh.emit signal_name="BEEP"
		 arg0=${BD.Stopwatch_NumberOfBeepsPerSecond}/>
      </hh.loop>
    </hh.module>;

// The LAP_FILTER hiphop code
//===========================

var LapFilterModule =
    <hh.module>
      
      // Lap filter I/Os
      //----------------
      <hh.inputsignal name="BASIC_STOPWATCH_TIME"
		      init_value=${SD.InitialStopwatchTime}/>
      <hh.inputsignal name="LAP_COMMAND"/>
      
      <hh.outputsignal name="STOPWATCH_TIME"
		       init_value=${SD.InitialStopwatchTime}/>
      <hh.outputsignal name="STOPWATCH_LAP_STATUS" init_value=${false}/>
      
      // Lap filter reactive code
      //=========================
      
      // loop between passing and non-passing mode
      
      <hh.loop>
	<hh.emit signal_name="STOPWATCH_LAP_STATUS" arg0=${false}/>
	
         // passing mode, until next LAP_COMMAND
	
	<hh.abort signal_name="LAP_COMMAND">
	  <hh.loopeach signal_name="BASIC_STOPWATCH_TIME">
	    <hh.emit signal_name="STOPWATCH_TIME"
		     arg0=${hh.value("BASIC_STOPWATCH_TIME")}/>
	  </hh.loopeach>
	</hh.abort>
	
        // LAP_COMMAND received, enter non-passing mode
	
	<hh.emit signal_name="STOPWATCH_LAP_STATUS" arg0=${true}/>	
	<hh.await signal_name="LAP_COMMAND"/>
	
      </hh.loop>
    </hh.module>;

// The STOPWATCH_RESET_HANDLER hiphop code
//========================================

var  StopwatchResetHandlerModule =
    <hh.module>

      //Stopwatch reset handler I/Os
      //============================
      
      <hh.inputsignal name="START_STOP_COMMAND"/>
      <hh.inputsignal name="LAP_COMMAND"/>
      <hh.outputsignal name="RESET_STOPWATCH"/>

      //Stopwatch reset handler reactive code
      //=====================================
       
      <hh.localsignal name="STOPWATCH_STOPPED">
	<hh.loop>
	  <hh.trap trap_name="Reset">
	    <hh.parallel>
	    
	    // compute STOPWATCH_STOPPED
	    
	      <hh.loop>
		<hh.abort signal_name="START_STOP_COMMAND">
		  <hh.sustain signal_name="STOPWATCH_STOPPED"/> 
		</hh.abort>
		<hh.await signal_name="START_STOP_COMMAND"/>
	      </hh.loop>
	    
            // compute RESET_STOPWATCH
	    
	      <hh.loop>
		<hh.await signal_name="LAP_COMMAND"/>
		<hh.present signal_name="STOPWATCH_STOPPED">
    	        // LAP_COMMAND received when stopwatch stopped
		  <hh.exit trap_name="Reset"/>
		</hh.present>
		<hh.await signal_name="LAP_COMMAND"/>
	      </hh.loop>
	    </hh.parallel>
	  </hh.trap>
	  <hh.emit signal_name="RESET_STOPWATCH"/>
	</hh.localsignal>
      </hh.loop>
    </hh.module>

// The main STOPWATCH hiphop code, obtained by combining BASIC_STOPWATCH,
// LAP_FILTER, and a reset detector

var StopwatchModule =
    <hh.module>
      
     // STOPWATCH I/Os
     //---------------
      <hh.inputsignal name="HS"/>
      <hh.inputsignal name="START_STOP_COMMAND"/>
      <hh.inputsignal name="LAP_COMMAND"/>
      
      <hh.outputsignal name="STOPWATCH_TIME" init_value=${SD.InitialStopwatchTime}/>
      <hh.outputsignal name="STOPWATCH_RUN_STATUS" init_value=${false}/>
      <hh.outputsignal name="STOPWATCH_LAP_STATUS" init_value=${false}/>
      <hh.outputsignal name="BEEP" init_value=${BD.NoBeep}/>
	<hh.outputsignal name="RESET_STOPWATCH"/>
     
     // STOPWATCH reactive code
     //------------------------
      
      <hh.localsignal name="BASIC_STOPWATCH_TIME"
		      init_value=${SD.InitialStopwatchTime}>
	  <hh.parallel>

            // run the basic stopwatch and lap filter in parallel
            // within a reset loopeach statement
	    //---------------------------------------------------
	    <hh.loopeach signal_name="RESET_STOPWATCH">
	      <hh.parallel>
		<hh.run module=${BasicStopwatchModule}
			sigs_assoc=${{"HS" : "HS",
				      "STOPWATCH_TIME" : "BASIC_STOPWATCH_TIME",
				      "START_STOP_COMMAND" : "START_STOP_COMMAND",
				      "STOPWATCH_RUN_STATUS" : "STOPWATCH_RUN_STATUS", 
				      "BEEP" : "BEEP"}}/>
		<hh.run module=${LapFilterModule}
			sigs_assoc=${{"BASIC_STOPWATCH_TIME" : "BASIC_STOPWATCH_TIME",
				      "LAP_COMMAND" : "LAP_COMMAND",
				      "STOPWATCH_TIME" : "STOPWATCH_TIME",
				      "STOPWATCH_LAP_STATUS" : "STOPWATCH_LAP_STATUS"}}/>
	      </hh.parallel>
	    </hh.loopeach>

	    // run the restet handler in parallel
	    <hh.run module=${StopwatchResetHandlerModule}
		    sigs_assoc=${{"START_STOP_COMMAND" : "START_STOP_COMMAND",
				  "LAP_COMMAND" : "LAP_COMMAND",
				  "RESET_STOPWATCH" : "RESET_STOPWATCH" }}/>
	  </hh.parallel>
	</hh.localsignal>
    </hh.module>

exports = StopwatchResetHandlerModule = StopwatchResetHandlerModule;
