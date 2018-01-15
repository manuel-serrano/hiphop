const hh = require("hiphop");

function callPromise(self) {
   return new Promise(function(resolve, reject) {
      console.log(`callPromise()`);
      setTimeout(function() {
	 console.log("has been killed?", self.killed);
	 reject("reject promise");
      }, 1000);
   });
}

const m = new hh.ReactiveMachine(MODULE {
   IN abrt;
   OUT res1, rej1;
   ABORT(NOW(abrt)) {
      PROMISE res1, rej1 callPromise(THIS) ONKILL console.log("killed!", THIS.killed);
   }
});

["res1", "rej1"].map(function(sig) {
   m.addEventListener(sig, function(evt) {
      console.log(evt);
   });
});

m.react()
m.inputAndReact("abrt");
