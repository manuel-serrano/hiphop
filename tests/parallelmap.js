"use hopscript"

const hh = require("hiphop");
const pm = hh.parallelmap;

function setTimeout( proc, count ) { 
   proc();
}

const simul_data = {
   "Air France": ["2A", "34F"],
   "Ryanair": ["12F", "9A", "32F"],
   "American Airlines": ["15C"],
   "British Airways": ["2D", "14A"]
};

function svcSeatGuru() {
   function rand(v) {
      switch (v) {
      case "Air France":
	 return 3;
      case "Ryanair":
	 return 5;
      case "American Airlines":
	 return 1;
      case "British Airways":
	 return 6;
      }
   }
   setTimeout(() => {
      console.log("svcSeatGuru", this.AIRLINE.nowval, "returns");
      this.notify(simul_data[this.AIRLINE.nowval]);
   }, rand(this.AIRLINE.nowval));
}

function svcSearch1() {
   setTimeout(() => {
      console.log("svcSearch1 0", this.SRC.nowval, this.DST.nowval, "returns");
      this.notify(Object.keys(simul_data))
   }, 0);
}

function svcSearch2() {
   setTimeout(() => {
      console.log("svcSearch2 1", this.SRC.nowval, this.DST.nowval, "returns");
      this.notify(Object.keys(simul_data).reverse())
   }, 1);
}

const machine = new hh.ReactiveMachine(
   <hh.module SRC DST AIRLINESWITHDIRECT>
     <hh.loopeach apply=${function() { return this.SRC.now || this.DST.now }}>
       <hh.local AIRLINESFOUND>
	 <hh.weakabort AIRLINESFOUND>
	   <hh.parallel>
	     <hh.exec AIRLINESFOUND apply=${svcSearch1}/>
	     <hh.exec AIRLINESFOUND apply=${svcSearch2}/>
	   </hh.parallel>
	 </hh.weakabort>
	 <hh.local TEMP=${{initValue: {}}}>
	   <pm.parallelmap apply=${function() {return this.AIRLINESFOUND.nowval}} AIRLINE>
	     <hh.local BADSEATS>
	       <hh.exec BADSEATS apply=${svcSeatGuru}/>
	       <hh.emit TEMP apply=${function() {
      	          let t = this.TEMP.preval;
      	          t[this.AIRLINE.nowval] = this.BADSEATS.nowval;
      	          return t;
	       }}/>
	     </hh.local>
	   </pm.parallelmap>
	   <hh.emit AIRLINESWITHDIRECT apply=${function() { return this.TEMP.nowval }}/>
	 </hh.local>
       </hh.local>
     </hh.loopeach>
   </hh.module>
   , {tracePropagation:false});

machine.addEventListener("AIRLINESWITHDIRECT", evt => console.log(evt.type,
								  evt.nowval));


machine.input("SRC", "Nice");
machine.input("DST", "Paris");
machine.react();

machine.input("SRC", "Montpellier");
machine.input("DST", "Dublin");
machine.react();
