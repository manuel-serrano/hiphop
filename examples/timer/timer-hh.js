const hh = require("hiphop");

function timeoutMod(nms) {
   return MODULE() {
      EXEC setTimeout(DONEREACT, nms) ONRES setTimeout(DONEREACT, nms)
   }
}

const basicTimer = MODULE(IN duration(0), OUT elapsed) {
   EMIT elapsed(0);
   LOOP {
      IF (VAL(elapsed) < VAL(duration)) {
	 RUN(timeoutMod(100));
	 EMIT elapsed(PREVAL(elapsed) + 0.1);
      } ELSE {
	 PAUSE;
      }
   }
}

const timer = MODULE(IN duration(0), IN reset, OUT elapsed) {
   LOOPEACH(NOW(reset)) {
      RUN(basicTimer);
   }
}

const suspendableTimer = MODULE(IN reset, IN suspend,
			      OUT elapsed(0), OUT suspendColor,
			      INOUT duration) {
   LOOPEACH(NOW(reset)) {
      FORK {
	 SUSPEND TOGGLE(NOW(suspend)) {
	    RUN(timer);
	 }
      } PAR {
	 EMIT suspendColor("transparent");
	 LOOP {
	    AWAIT(NOW(suspend));
	    EMIT suspendColor("orange");
	    AWAIT(NOW(suspend));
	    EMIT suspendColor("transparent");
	 }
      }
   }
}

module.exports = new hh.ReactiveMachine(suspendableTimer);
