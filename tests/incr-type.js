"use hopscript"

function WatchTimeType(h, m, s, ampm) {
   this.hours = h;
   this.minutes = m;
   this.seconds = s;
   this.ampm = ampm;
}


var WatchTime = new WatchTimeType(0, 0, 0, false);

function IncrementTimeInPlace (t) {
   console.log("foo", t);
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

function print_time(evt) {
   console.log(evt.value.hours
	       + ":" + evt.value.minutes
	       + ":" + evt.value.seconds);
}


var rjs = require("hiphop");

var prg =
    <rjs.reactivemachine debug name="Foo">
      <rjs.inputsignal name="I"/>
      <rjs.outputsignal name="Time"
			type=${WatchTimeType}
			init_value=${WatchTime}/>
      <rjs.loop>
	<rjs.sequence>
	  <rjs.emit signal_name="Time"
		    func=${IncrementTimeInPlace}
		    exprs=${rjs.preValue("Time")}/>
	  <rjs.pause/>
	</rjs.sequence>
      </rjs.loop>
    </rjs.reactivemachine>;

prg.addEventListener("Time", print_time);

exports.prg = prg;
