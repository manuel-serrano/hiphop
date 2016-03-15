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


var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="Time" init_value=${WatchTime}/>
      <hh.loop>
	<hh.sequence>
	  <hh.emit signal_name="Time"
		    func=${IncrementTimeInPlace}
		    args=${hh.preValue("Time")}/>
	  <hh.pause/>
	</hh.sequence>
      </hh.loop>
    </hh.module>;

var m = new hh.ReactiveMachine(prg, "Foo");

m.addEventListener("Time", print_time);

exports.prg = m;
