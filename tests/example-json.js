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
   if (t.seconds == 3) {
      t.seconds = 0;
      if (t.minutes == 3) {
	 t.minutes = 0;
	 if (t.hours == 3) {
	    t.hours = 0;
	 } else {
	    t.hours++;
	 }
      } else {
	 t.minutes++;
      }
   } else {
      t.seconds++;
   }
   return t;
}

function updateFromOutside(inwatch, outwatch) {
   inwatch.hours = outwatch.hours;
   inwatch.minutes = outwatch.minutes;
   inwatch.seconds = outwatch.seconds;
   inwatch.ampm = outwatch.ampm;
   return inwatch;
}


var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.inputsignal name="TIN" valued />
      <hh.outputsignal name="Time"
			type=${WatchTimeType}
			init_value=${WatchTime}/>
      <hh.loop>
	<hh.emit signal_name="Time"
		  func=${IncrementTimeInPlace}
		  exprs=${hh.preValue("Time")}/>
	<hh.pause/>
	<hh.await signal_name="TIN"/>
	<hh.emit signal_name="Time"
		  func=${updateFromOutside}
		  exprs=${[hh.preValue("Time"), hh.value("TIN")]}/>
	<hh.pause/>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "Foo");
