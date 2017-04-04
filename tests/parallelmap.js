"use hopscript"

const hh = require("hiphop");
const pm = hh.parallelmap;

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
      console.log("svcSeatGuru", this.value.AIRLINE, "returns");
      this.notifyAndReact(simul_data[this.value.AIRLINE]);
   }, rand(this.value.AIRLINE));
}

function svcSearch1() {
   setTimeout(() => {
      console.log("svcSearch1 0", this.value.SRC, this.value.DST, "returns");
      this.notifyAndReact(Object.keys(simul_data))
   }, 0);
}

function svcSearch2() {
   setTimeout(() => {
      console.log("svcSearch2 1", this.value.SRC, this.value.DST, "returns");
      this.notifyAndReact(Object.keys(simul_data).reverse())
   }, 1);
}

const machine = new hh.ReactiveMachine(
   <hh.module SRC DST AIRLINESWITHDIRECT>
     <hh.loopeach apply=${function() { return this.present.SRC || this.present.DST }}>
       <hh.local AIRLINESFOUND>
	 <hh.weakabort AIRLINESFOUND>
	   <hh.parallel>
	     <hh.exec AIRLINESFOUND apply=${svcSearch1}/>
	     <hh.exec AIRLINESFOUND apply=${svcSearch2}/>
	   </hh.parallel>
	 </hh.weakabort>
	 <hh.local TEMP=${{initValue: {}}}>
	   <pm.parallelmap apply=${function() {return this.value.AIRLINESFOUND}} AIRLINE>
	     <hh.local BADSEATS>
	       <hh.exec BADSEATS apply=${svcSeatGuru}/>
	       <hh.emit TEMP apply=${function() {
      	          let t = this.preValue.TEMP;
      	          t[this.value.AIRLINE] = this.value.BADSEATS;
      	          return t;
	       }}/>
	     </hh.local>
	   </pm.parallelmap>
	   <hh.emit AIRLINESWITHDIRECT apply=${function() { return this.value.TEMP }}/>
	 </hh.local>
       </hh.local>
     </hh.loopeach>
   </hh.module>
);

machine.addEventListener("AIRLINESWITHDIRECT", evt => console.log(evt.signalName,
								  evt.signalValue));


machine.input("SRC", "Nice");
machine.input("DST", "Paris");
machine.react();

machine.input("SRC", "Montpellier");
machine.input("DST", "Dublin");
machine.react();
