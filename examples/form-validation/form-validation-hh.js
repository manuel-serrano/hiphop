const hh = require("hiphop", "hopscript");

module.exports = new hh.ReactiveMachine(
   MODULE (IN text, OUT status, OUT error) {
      LOOPEACH(NOW(text)) {
	 EMIT status("checking");
	 RUN(timeoutModule(500));
	 PROMISE status, error check(VAL(text));
      }
   }
);

function timeoutModule(ms) {
   return MODULE {
      EXEC setTimeout(DONEREACT, ms);
   }
}
