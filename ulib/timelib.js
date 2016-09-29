"use hopscript"

const hh = require("hiphop");

//
// Could be merged in lib/lang.js, since usefull in lot of cases.
//
function expandChildren(children) {
   return <hh.sequence>
       ${hh.isHiphopInstruction(children[0]) ? children[0] : <hh.nothing foo/>}
       ${children.length > 1 ?
	 expandChildren(children.slice(1)) :
	 <hh.nothing foo/>}
   </hh.sequence>;
}


const TIMEOUT = function(attrs) {
   return <hh.run module=${
      <hh.module timetowait>
	<hh.emit timetowait value=${attrs.value} apply=${attrs.apply}/>
	<hh.exec apply=${function() {
	   setTimeout(this.returnAndReact, this.value.timetowait);
	}}/>
      </hh.module>
   }/>
}

exports.TIMEOUT = TIMEOUT;

const INTERVAL = function(attrs) {
   function _body(args) {
      return <hh.sequence>
	<timeout value=${attrs.value} apply=${attrs.apply}/>
        ${expandChildren(Array.prototype.slice.call(args, 1, args.length))}
      </hh.sequence>
   }

   let count_value;
   let count_apply;
   let ret;

   for (let i in attrs) {
      if (i.toLowerCase() == "countvalue")
	 count_value = attrs[i];
      if (i.toLowerCase() == "countapply")
	 count_apply = attrs[i];
   }

   //
   // TODO: any HH program should have an implicit signal TICK that is
   // present at each reaction. It could avoid hacks like this one
   // (apply=${() => true} / or make a local signal emitted when enter
   // in loop).
   //
   if (count_value !== undefined || count_apply !== undefined) {
      ret = <hh.abort apply=${() => true}
		      countApply=${count_apply}
		      countValue=${count_value}>
	<hh.loop>
	    ${_body(arguments)}
	</hh.loop>
      </hh.abort>;
   } else {
      ret = <hh.loop>
        ${_body(arguments)}
      </hh.loop>;
   }

   return ret;
}

exports.INTERVAL = INTERVAL;
