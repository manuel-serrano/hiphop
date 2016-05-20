"use hopscript"

var TD = require("../data/time-data.js")
var BD = require("../data/beep-data.js")

//=========================
// Watch Time and Positions
//=========================

// Build a WatchTime

function WatchTime(h, mn, s, mode) {
   this.hours = h;
   this.minutes = mn;
   this.seconds = s;
   this.mode = mode;
}
exports.WatchTime = WatchTime;

var InitialWatchTime = new WatchTime(0,0,0,"24H")
exports.InitialWatchTime = InitialWatchTime;

// Turn a WatchTime into a string

WatchTime.prototype.toString = function() {
   return this.hours + ":" + this.minutes + ":" + this.seconds
      + " " + this.mode ;
}

// Print a WatchTime event

function PrintWatchTimeEvent (evt) {
   var wt = evt.value;
   console.log(wt.hours + ":" + wt.minutes + ":" + wt.seconds
	       + " " + wt.mode);
}
exports.PrintWatchTimeEvent = PrintWatchTimeEvent;

// Parse a WatchTime from a string

function ParseWatchTime (str) {
   var clock_ampm = str.split(" ");
   var clock = clock_ampm[0].split(":");
   return new WatchTime(clock[0], clock[1], clock[2], clock_ampm);
}
exports.ParseWatchTime = ParseWatchTime;

// Toggle a WatchTime between 24H mode (the default) and AM/PM mode

function ToggleWatchTimeMode (wt) {
   var res = new WatchTime(wt.hours, wt.minutes, wt.seconds, wt.mode);
   if (res.mode == "24H") {
      // switch to ampn mode
      if (res.hours == 0) {
	 res.mode = "PM";
	 res.hours = TD.HoursPerHalfDay;
      } else if (res.hours <= TD.HoursPerHalfDay) {
	 res.mode = "AM";
      } else {
	 res.mode = "PM";
	 res.hours -= TD.HoursPerHalfDay;
      }
   } else {
      // switch to 24h mode
      if (res.mode == "PM") {
	 res.hours = (res.hours+TD.HoursPerHalfDay) % TD.HoursPerDay;
      }
      res.mode = "24H";
   }
   return res;
}
exports.ToggleWatchTimeMode = ToggleWatchTimeMode;

// Increment a WatchTime by one second (functional)

function IncrementWatchTime (wt) {
   var res = new WatchTime(wt.hours, wt.minutes, wt.seconds, wt.mode);

   if (res.mode != "24H") ToggleWatchTimeMode(res);
   res.seconds++;
   if (res.seconds == TD.SecondsPerMinute) {
      res.seconds = 0;
      res.minutes++;
      if (res.minutes == TD.MinutesPerHour) {
	 res.minutes = 0;
	 res.hours++;
	 if (res.hours == TD.HoursPerDay) {
	    res.hours = 0;
	 }
      }
   }
   if (res.mode != "24H") ToggleWatchTimeMode(res);
   return res;
}
exports.IncrementWatchTime = IncrementWatchTime;

// WatchTime positions to be set and enhanced
// 0=hours, 1=minutes, 2=seconds
//===========================================

// The initial WatchTime position is hours

var InitialWatchTimePosition = 0;

// Go to next WatchTimePosition

function NextWatchTimePosition (wtp) {
   return (wtp+1) % 3;
}
exports.NextWatchTimePosition = NextWatchTimePosition;

// To set a WatchTime, increment only at a given position (no carry)

function IncrementWatchTimeAtPosition (wt, pos) {
   var res = wt;
   if (wt.mode != "24H") ToggleWatchTimeMode(res);
   switch (pos) {
   case 0 :
      res.hours = (res.hours+1) % TD.HoursPerDay;
      break;
   case 1 :
      res.minutes = (res.minutes+1) % TD.MinutesPerHour;
      break;
   case 2 :
      res.seconds = (res.seconds+1) % TD.SecondsPerMinute;
      break;
   }
   if (wt.mode != "24H") ToggleWatchTimeMode(res);
   return res;
}
exports.IncrementWatchTimeAtPosition = IncrementWatchTimeAtPosition;

// Beep (chimeonce if full hour and shouldBeep argument true 
// (testing minutes and seconds only is OK in 2$H 

function WatchBeep (wtp, shouldBeep) {
   if (shouldBeep && wtp.minutes==0 & wtp.seconds == 0) {
      return BD.Watch_NumberOfBeepsPerSecond;
   } else {
      return BD.NoBeep;
    }
}
exports.WatchBeep = WatchBeep;
