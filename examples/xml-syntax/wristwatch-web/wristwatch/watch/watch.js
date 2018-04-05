//==================
// HipHop WATCH code
//==================

var B = require("../basic/basic.js");
var WD = require("./watch-data.js");

var hh = require("hiphop");
exports.hh = hh;

//----------------------
// The WATCH hiphop code
//----------------------

var WatchModule =
    <hh.module S
               TOGGLE_24H_MODE_COMMAND
               WATCH_TIME=${{initValue: WD.InitialWatchTime}}
               ENTER_SET_WATCH_MODE_COMMAND
               SET_WATCH_COMMAND
               NEXT_WATCH_TIME_POSITION_COMMAND
               EXIT_SET_WATCH_MODE_COMMAND
               WATCH_BEING_SET
	       START_ENHANCING
	       STOP_ENHANCING
	       TOGGLE_CHIME_COMMAND
	       CHIME_STATUS
	       BEEP>

      // Reactive code
      //==============

      // initialisation

      <hh.emit WATCH_TIME value=${WD.InitialWatchTime}/>
      <hh.emit CHIME_STATUS value=${false}/>

      // loop between watch mode and set-watch mode

      <hh.loop>

        // watch mode

	<hh.abort ENTER_SET_WATCH_MODE_COMMAND>
          <hh.parallel>

            // react to seconds by incrementing time and computing beep number
            <hh.every S>
	      <hh.emit WATCH_TIME apply=${function() {
		 return WD.IncrementWatchTime(this.preValue.WATCH_TIME)}}/>
              <hh.emit BEEP apply=${function() {
		 return WD.WatchBeep(this.value.WATCH_TIME, this.value.CHIME_STATUS)}}/>
            </hh.every>

            // react to mode toggling command by toggling WatchTime mode
             <hh.every TOGGLE_24H_MODE_COMMAND>
               <hh.emit WATCH_TIME apply=${function() {
		  return WD.ToggleWatchTimeMode(this.preValue.WATCH_TIME)}}/>
             </hh.every>

             // react to chime togging command by toggling chime status
             <hh.every TOGGLE_CHIME_COMMAND>
               <hh.emit CHIME_STATUS apply=${function() {
		  return B.bnot(this.preValue.CHIME_STATUS)}}/>
             </hh.every>

          </hh.parallel>
       </hh.abort>

       // set-watch mode

       <hh.abort EXIT_SET_WATCH_MODE_COMMAND>
          // enhance initial position
        // GB : CV bug !       should  be arg=${WD.InitialWatchTimePosition}
         <hh.emit START_ENHANCING value=${0}/>
         <hh.parallel>

            // react to set-wacth command bu updating position
            <hh.every SET_WATCH_COMMAND>
              <hh.emit WATCH_TIME apply=${function() {
		 return WD.IncrementWatchTimeAtPosition(this.preValue.WATCH_TIME,
							this.preValue.START_ENHANCING)}}/>
            </hh.every>

            // react to next-position command
            // by moving enhancement to the new position
            <hh.every NEXT_WATCH_TIME_POSITION_COMMAND>
              <hh.emit STOP_ENHANCING apply=${function() {
		 return this.preValue.STOP_ENHANCING}}/>
              <hh.emit START_ENHANCING apply=${function() {
		 return WD.NextWatchTimePosition(this.preValue.START_ENHANCING)}}/>
            </hh.every>

          </hh.parallel>
       </hh.abort>
       <hh.emit STOP_ENHANCING apply=${function() {
	  return this.preValue.STOP_ENHANCING}}/>
      </hh.loop>
    </hh.module>;

exports.WatchModule = WatchModule;
