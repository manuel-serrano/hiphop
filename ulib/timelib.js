"use hopscript"

const hh = require("hiphop");

//
// Could be merged in lib/lang.js, since usefull in lot of cases.
//
function expandChildren(children) {
   return <hh.sequence>
      ${hh.isHiphopInstruction(children[0]) ? children[0] : <hh.nothing/>}
      ${children.length > 1 ? expandChildren(children.slice(1)) : <hh.nothing/>}
   </hh.sequence>;
}


const TIMEOUT = function(attrs) {
   return <hh.run module=${
      <hh.module timetowait>
	<hh.emit timetowait value=${attrs.value} apply=${attrs.apply}/>
	<hh.exec apply=${function() {
	   setTimeout(this.returnAndReact, parseInt(this.value.timetowait));
	}}/>
      </hh.module>
   }/>
}

exports.TIMEOUT = TIMEOUT;

const INTERVAL = function(attrs) {
   let count_value;
   let count_apply;
   let ret;

   function _mk_timeout(fargs) {
      return <hh.sequence>
	<hh.emit TIMEOUT value=${attrs.value} apply=${attrs.apply}/>
	<hh.exec apply=${function() {
	   setTimeout(this.returnAndReact, this.value.TIMEOUT);
	}}/>
	${expandChildren(Array.prototype.slice.call(fargs, 1, fargs.length))}
      </hh.sequence>;
   }

   for (let i in attrs) {
      if (i.toLowerCase() == "countvalue")
	 count_value = attrs[i];
      if (i.toLowerCase() == "countapply")
	 count_apply = attrs[i];
   }

   if (count_value !== undefined || count_apply !== undefined) {
      ret = <hh.trap INTERVAL_TRAP>
	<hh.let INTERVAL_BOOKKEEPING=${{initValue: -1}} TIMEOUT>
	  <hh.loop>
	    <hh.emit INTERVAL_BOOKKEEPING
	      value=${count_value}
	      apply=${count_apply}
	      ifApply=${function() {
		 return this.preValue.INTERVAL_BOOKKEEPING < 0}}/>

            <hh.if apply=${function() {
	       return this.value.INTERVAL_BOOKKEEPING == 0}}>
		   <hh.exit INTERVAL_TRAP/>
            </hh.if>

	    ${_mk_timeout(arguments)}

	    <hh.emit INTERVAL_BOOKKEEPING apply=${function() {
	       return this.preValue.INTERVAL_BOOKKEEPING - 1}}/>
	  </hh.loop>
	</hh.let>
      </hh.trap>;
   } else {
      ret = <hh.let TIMEOUT>
	<hh.loop>
	  ${_mk_timeout(arguments)}
	</hh.loop>
      </hh.let>;
   }

   return ret;
}

exports.INTERVAL = INTERVAL;
