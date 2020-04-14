"use hopscript"

const hh = require("../lib/hiphop.js");
const lang = require("../lib/lang.js");
const next_id = (() => {
   let lbl = "__PARALLELMAP_ID__";
   let id = 0;
   return () => lbl + id++;
})();

const PARALLELMAP = (attrs) => {
   let loc = null;
   let id = next_id();
   let sigName = null;
   let apply = null;
   let value = null;
   let fargs = arguments;
   let mkChild = (el) => {
      return <hh.local ${sigName}>
	<hh.emit nodebug ${sigName} value=${el}/>
        ${lang.expandChildren(fargs).clone()}
      </hh.local>;
   }

   for (let attr in attrs) {
      if (attr == "%location") {
	 loc = lang.format_loc(attrs[attr]);
      } else if (attr.toLowerCase() == "apply") {
	 apply = attrs[attr];
      } else if (attr.toLowerCase() == "value") {
	 value = attrs[attr];
      }
   }

   sigName = lang.getSignalNameList( "PARALLEMAP", attrs, lang.format_loc(attrs))[0];
   if (!sigName) {
      throw new error.SyntaxError("Signal name is missing.", loc);
   }

   return <hh.local __PARALLELMAP_LOCAL__ nodebug>
     <hh.emit __PARALLELMAP_LOCAL__ nodebug apply=${apply} value=${value}/>
     <hh.atom nodebug apply=${function() {
	let par = this.machine.getElementById(id);
	for (let i = 0; i < par.children.length; i++)
	   par.removeChild(par.children[i]);
	this.__PARALLELMAP_LOCAL__.nowval.forEach(el => {
	   par.appendChild(mkChild(el));
	});
	this.machine.react();
     }}/>
     <hh.pause nodebug/>
     <hh.parallel id=${id}>
       <hh.nothing nodebug/>
     </hh.parallel>
   </hh.local>
}
exports.PARALLELMAP = PARALLELMAP;
