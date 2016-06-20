"use hopscript"

function WatchTimeType(h, m, s, ampm) {
   this.hours = h;
   this.minutes = m;
   this.seconds = s;
   this.ampm = ampm;
}

WatchTimeType.prototype.toString = function() {
   return this.hours + ":" + this.minutes + ":" + this.seconds  + " "
      + (this.ampm ? "AM" : "PM");
}

var WatchTime = new WatchTimeType(0, 0, 0, false);

function IncrementTimeInPlace (t) {
   let hours = t.hours;
   let minutes = t.minutes;
   let seconds = t.seconds;

   if (t.seconds == 3) {
      seconds = 0;
      if (t.minutes == 3) {
	 minutes = 0;
	 if (t.hours == 3) {
	    hours = 0;
	 } else {
	    hours++;
	 }
      } else {
	 minutes++;
      }
   } else {
      seconds++;
   }
   return new WatchTimeType(hours, minutes, seconds, t.ampm);
}

function updateFromOutside(watch) {
   return new WatchTimeType(watch.hours, watch.minutes, watch.seconds, watch.ampm);
}


var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.inputsignal name="TIN" valued />
      <hh.outputsignal name="Time"
			value=${WatchTime}/>
      <hh.loop>
	<hh.emit signal="Time"
		  func=${IncrementTimeInPlace}
		  arg=${hh.preValue("Time")}/>
	<hh.pause/>
	<hh.await signal="TIN"/>
	<hh.emit signal="Time"
		  func=${updateFromOutside}
		  arg=${hh.value("TIN")}/>
	<hh.pause/>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "Foo");
