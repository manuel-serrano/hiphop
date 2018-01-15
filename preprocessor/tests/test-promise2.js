const hh = require("hiphop");

function callPromise(willReject) {
   return new Promise(function(resolve, reject) {
      console.log(`callPromise(${willReject})`);
      setTimeout(function() {
	 if (willReject) {
	    reject("reject promise");
	 } else {
	    resolve("resolve promise");
	 }
      }, 5000);
   });
}

const m = new hh.ReactiveMachine(MODULE {
   IN abrt;
   OUT res1, rej1;
   ABORT(NOW(abrt)) {
      PROMISE res1, rej1 callPromise(true) ONKILL console.log("killed!");
   }
});

["res1", "rej1"].map(function(sig) {
   m.addEventListener(sig, function(evt) {
      console.log(evt);
   });
});

m.react()
m.inputAndReact("abrt");
