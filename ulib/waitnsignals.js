"use hopscript"

const hh = require("hiphop");

//
// Wait for N signals in parallel, given in attrs. Then, emit the last
// signal given in attrs.
//
const AWAITNEMIT = function(attrs) {
   let instr_list = [];

   for (let i = 0; i < attrs.length - 2; i++)
      if (attrs[i] != "%location")
	 instr_list.push(hh.AWAIT(attrs[i]));


   return <hh.sequence>
     <hh.parallel>
     ${instr_list}
     </hh.parallel>
     <hh.emit ${attrs.length - 1}/>
   </hh.sequence>;
}

exports.AWAITNEMIT = AWAITNEMIT;

//
// Same as AWAITNEMIT, but in module version that can be used in RUN
//
const MAWAITNEMIT = function(attrs) {
   return hh.MODULE.apply(null, [attrs, AWAITNEMIT.apply(null, attrs)]);
}

exports.MAWAITNEMIT = MAWAITNEMIT;
