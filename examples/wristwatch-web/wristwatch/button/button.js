"use hopscript"

//=============================================
// The BUTTON module : command buttons decoding
//=============================================

var hh = require("hiphop");
exports.hh = hh;

var ButtonModule = <hh.module>

    // Interface
    //----------

    // input buttons
    <hh.inputsignal name ="UL"/>
    <hh.inputsignal name ="UR"/>
    <hh.inputsignal name ="LL"/>
    <hh.inputsignal name ="LR"/>

    // watch commands
    <hh.outputsignal name="WATCH_MODE_COMMAND"/>
    <hh.outputsignal name="ENTER_SET_WATCH_MODE_COMMAND"/>
    <hh.outputsignal name="SET_WATCH_COMMAND"/>
    <hh.outputsignal name="NEXT_WATCH_TIME_POSITION_COMMAND"/>
    <hh.outputsignal name="EXIT_SET_WATCH_MODE_COMMAND"/>
    <hh.outputsignal name="TOGGLE_24H_MODE_COMMAND"/>
    <hh.outputsignal name="TOGGLE_CHIME_COMMAND"/>

    // stopwatch commands
    <hh.outputsignal name="STOPWATCH_MODE_COMMAND"/>
    <hh.outputsignal name="START_STOP_COMMAND"/>
    <hh.outputsignal name="LAP_COMMAND"/>

    // alarm commands
    <hh.outputsignal name="ALARM_MODE_COMMAND"/>
    <hh.outputsignal name="ENTER_SET_ALARM_MODE_COMMAND"/>
    <hh.outputsignal name="SET_ALARM_COMMAND"/>
    <hh.outputsignal name="NEXT_ALARM_TIME_POSITION_COMMAND"/>
    <hh.outputsignal name="EXIT_SET_ALARM_MODE_COMMAND"/>
    <hh.outputsignal name="TOGGLE_ALARM_COMMAND"/>
    <hh.outputsignal name="STOP_ALARM_BEEP_COMMAND"/>

    // global loop
    <hh.loop>
    
      // Watch / set-watch mode
      //-----------------------

      <hh.emit signal_name="WATCH_MODE_COMMAND"/>
      <hh.trap trap_name="WATCH_AND_SET_WATCH_MODE">
         <hh.loop> 

         // watch mode
            <hh.abort signal_name="UL">
               <hh.parallel>
                  <hh.sequence>
                     <hh.await signal_name="LL"/>
                     <hh.exit trap_name="WATCH_AND_SET_WATCH_MODE"/>
                  </hh.sequence>
                  <hh.every signal_name="LR">
                     <hh.emit signal_name="TOGGLE_24H_MODE_COMMAND"/>
                  </hh.every>
               </hh.parallel>
            </hh.abort>

            // set-watch mode
            <hh.emit signal_name="ENTER_SET_WATCH_MODE_COMMAND"/>
            <hh.abort signal_name="UL">
               <hh.parallel>
                  <hh.every signal_name="LL">
                     <hh.emit signal_name="NEXT_WATCH_TIME_POSITION_COMMAND"/>
                  </hh.every> 
                  <hh.every signal_name="LR">
                     <hh.emit signal_name="SET_WATCH_COMMAND"/>
                  </hh.every>
               </hh.parallel>
            </hh.abort>
            <hh.emit signal_name="EXIT_SET_WATCH_MODE_COMMAND"/>

         </hh.loop> 
      </hh.trap>

      // Stopwatch mode
      //---------------

      <hh.emit signal_name="STOPWATCH_MODE_COMMAND"/>
      <hh.abort signal_name="LL">
         <hh.parallel>
            <hh.every signal_name="LR">
               <hh.emit signal_name="START_STOP_COMMAND"/>
            </hh.every>
            <hh.every signal_name="UR">
               <hh.emit signal_name="LAP_COMMAND"/>
            </hh.every>
         </hh.parallel>
      </hh.abort>

      // Alarm / set alarm mode
      //-----------------------

      <hh.emit signal_name="ALARM_MODE_COMMAND"/>
      <hh.trap trap_name="ALARM_AND_SET_ALARM_MODE">
         <hh.loop> 
    
            // alarm mode
            <hh.abort signal_name="UL">
               <hh.parallel>
                  <hh.sequence>
                     <hh.await signal_name="LL"/>
                     <hh.exit trap_name="ALARM_AND_SET_ALARM_MODE"/>
                  </hh.sequence>
                  <hh.every signal_name="LR">
                     <hh.emit signal_name="TOGGLE_CHIME_COMMAND"/>
                  </hh.every> 
                  <hh.every signal_name="UR">
                     <hh.emit signal_name="TOGGLE_ALARM_COMMAND"/>
                  </hh.every>
               </hh.parallel>
            </hh.abort>

            // set-alarm mode
            <hh.emit signal_name="ENTER_SET_ALARM_MODE_COMMAND"/>
            <hh.abort signal_name="UL">
               <hh.parallel>
                  <hh.every signal_name="LL">
                     <hh.emit signal_name="NEXT_ALARM_TIME_POSITION_COMMAND"/>
                  </hh.every>
                  <hh.every signal_name="LR">
                     <hh.emit signal_name="SET_ALARM_COMMAND"/>
                  </hh.every>
               </hh.parallel>
            </hh.abort>
            <hh.emit signal_name="EXIT_SET_ALARM_MODE_COMMAND"/>

         </hh.loop>
       </hh.trap>
    
    </hh.loop>
 </hh.module>;

exports.ButtonModule = ButtonModule;
