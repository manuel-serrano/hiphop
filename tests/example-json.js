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


var rjs = require("hiphop");

var prg =
    <rjs.reactivemachine debug name="Foo">
      <rjs.inputsignal name="I"/>
      <rjs.inputsignal name="TIN" valued />
      <rjs.outputsignal name="Time"
			type=${WatchTimeType}
			init_value=${WatchTime}/>
      <rjs.loop>
	<rjs.emit signal_name="Time"
		  func=${IncrementTimeInPlace}
		  exprs=${rjs.preValue("Time")}/>
	<rjs.pause/>
	<rjs.await signal_name="TIN"/>
	<rjs.emit signal_name="Time"
		  func=${updateFromOutside}
		  exprs=${[rjs.preValue("Time"), rjs.value("TIN")]}/>
	<rjs.pause/>
      </rjs.loop>
    </rjs.reactivemachine>;

rjs.batch_interpreter(prg);
