const hh = require("hiphop");

function callPromise(willReject) {
   return new Promise(function(resolve, reject) {
      console.log(`callPromise(${willReject})`);
      if (willReject) {
	 reject("reject promise");
      } else {
	 resolve("resolve promise");
      }
   });
}

const m = new hh.ReactiveMachine(MODULE {
   OUT res1, rej1, res2, rej2;
   FORK {
      PROMISE res1, rej1 callPromise(true);
   } PAR {
      PROMISE res2, rej2 callPromise(false);
   }
});

["res1", "rej1", "res2", "rej2"].map(function(sig) {
   m.addEventListener(sig, function(evt) {
      console.log(evt);
   });
});

m.react()
