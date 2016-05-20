var TD = require("../data/time-data")
var BD = require("../data/beep-data");
var WD = require("../watch/watch-data");

//=========================
// Alarm Time and Positions
//=========================

//-----------
// Alarm Time
//-----------

// Build an AlarmTime

function AlarmTime (h, mn, mode) {
   this.hours = h;
   this.minutes = mn;
   this.mode = mode;
}
exports.AlarmTime = AlarmTime;

// Initial alarm time

var InitialAlarmTime = new AlarmTime(0,0,"24H");
exports.InitialAlarmTime = InitialAlarmTime;

// Turn an AlarmTime into a string

AlarmTime.prototype.toString = function() {
   return this.hours + ":" + this.minutes + " " + this.mode ;
}

// Print an AlarmTime event

function PrintAlarmTimeEvent (evt) {
   var at = evt.value;
   console.log(at.hours + ":" + at.minutes + " " + at.mode);
}
exports.PrintAlarmTimeEvent = PrintAlarmTimeEvent;

// Toggle an AlarmTime between 24H mode (the default) and AM/PM mode

function ToggleAlarmTimeMode (at) {
   var res = at;
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
exports.ToggleAlarmTimeMode = ToggleAlarmTimeMode;

// Compare an AlarmTime to a WatchTime

function CompareAlarmTimeToWatchTime (at, wt) {
   // copy times to avoid side-effects
   var local_at = at;
   if (at.mode != "24H") ToggleAlarmTimeMode(local_at);
   var local_wt = wt;
   if (wt.mode != "24H") WD.ToggleWatchTimeMode(local_wt);
   res = (local_at.hours==local_wt.hours) && (local_at.minutes==local_wt.minutes);
   return res;
}
exports.CompareAlarmTimeToWatchTime = CompareAlarmTimeToWatchTime;

// AlarmTime positions to be set and enhanced
// 0=hours, 1=minutes
//===========================================

// Initial AlarmTimePosition

var InitialAlarmTimePosition = 0;
exports.InitialAlarmTimePosition = InitialAlarmTimePosition;

// Go to next AlarmTimePosition

function NextAlarmTimePosition (atp) {
   return (atp+1) % 2;
}
exports.NextAlarmTimePosition = NextAlarmTimePosition;

// To set a AlarmTime, increment only at  given position (no carry)

function IncrementAlarmTimeAtPosition (at, pos) {
   var res = at;
   if (at.mode != "24H") ToggleAlarmTimeMode(res);
   switch (pos) {
   case 0 : res.hours = (res.hours+1) % TD.HoursPerDay; break;
   case 1 : res.minutes = (res.minutes+1) % TD.MinutesPerHour; break;
   }
   if (at.cmode != "24H") ToggleAlarmTimeMode(res);
   return res;
}
exports.IncrementAlarmTimeAtPosition = IncrementAlarmTimeAtPosition;

// Beep four times a second (when time is equal to watch time and alarm is on)

function AlarmBeep (atp, wtp, shouldBeep) {
    if (shouldBeep && wtp.hours==atp.hours & wtp.minutes==atp.minutes) {
	return BD.Alarm_NumberOfBeepsPerSecond;
    } else {
	return 0;
    }
}
exports.AlarmBeep = AlarmBeep;


