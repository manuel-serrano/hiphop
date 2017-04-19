"use hopscript"

const hh = require("hiphop");

// const m = new hh.ReactiveMachine(
//    <hh.module S R E>
//      <hh.loop>
//        <hh.suspend immediate from=S to=R emitWhenSuspended=E>
// 	 <hh.atom apply=${() => console.log("not suspended!")}/>
//        </hh.suspend>
//        <hh.pause/>
//      </hh.loop>
//    </hh.module>
// );

const m = new hh.ReactiveMachine(
   <hh.module S R E>
     <hh.suspend from=S to=R emitWhenSuspended=E>
       <hh.loop>
	 <hh.atom apply=${() => console.log("not suspended!")}/>
	 <hh.pause/>
       </hh.loop>
     </hh.suspend>
   </hh.module>
);

m.debug_emitted_func = emitted => {
   console.log(emitted);
   console.log("---------------------");
};

m.react()
m.react()
m.inputAndReact("S");
m.react()
m.react()
m.inputAndReact("R");
m.react()
m.react()
