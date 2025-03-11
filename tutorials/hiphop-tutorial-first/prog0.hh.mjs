// prog0.hh.mjs
import * as hh from "@hop/hiphop"; // import the HipHop library

const prog0 = hiphop module() {    // the HipHop program
   inout I, O;                     // two input/output signals
	
   loop {                          // an infinite loop 
      if (I.now) {                 // test if I is present
	 emit O(I.nowval);         // if it is emit O with the value of I
      }
      yield;                       // all loop _must_ contain a yield stmt
   }
}

const m = new hh.ReactiveMachine(prog0); // create the reactive machine

m.addEventListener("O", v => console.log(v)); // a listener to see O events

m.react();           // invoke the machine without any signal
m.react({I: 1});     // invoke the machine with I=1
m.react({I: 2});     // invoke the machine with I=2
m.react({I: 3});     // invoke the machine with I=3 ...
