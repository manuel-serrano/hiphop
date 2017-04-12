"use hopscript"

const hh = require("hiphop");
const lang = require("../lib/lang.js");

const TIMEOUT = function(attrs) {
   let sig = lang.get_signal_name_list(attrs, lang.format_loc(attrs))[0];
   let exec;
   let timeoutIdMap = {};

   if (sig) {
      exec = <hh.exec ${sig}
             apply=${function() {
	        timeoutIdMap[this.id] = setTimeout(this.notifyAndReact,
	     					   parseInt(this.value.timetowait))}}
	     res=${function() {
		timeoutIdMap[this.id] = setTimeout(this.notifyAndReact,
	     					   parseInt(this.value.timetowait))}}
             susp=${function() {
		let id = timeoutIdMap[this.id];
		if (id) {
		   clearTimeout(id);
		}
	     }}
             kill=${function() {
		let id = timeoutIdMap[this.id];
		if (id) {
		   clearTimeout(id);
		}
	     }}
	 />
   } else {
      exec = <hh.exec
             apply=${function() {
		timeoutIdMap[this.id] = setTimeout(this.notifyAndReact,
	     					   parseInt(this.value.timetowait))}}
	     res=${function() {
		timeoutIdMap[this.id] = setTimeout(this.notifyAndReact,
	     					   parseInt(this.value.timetowait))}}
             susp=${function() {
		let id = timeoutIdMap[this.id];
		if (id) {
		   clearTimeout(id);
		}
	     }}
             kill=${function() {
	        let id = timeoutIdMap[this.id];
		if (id) {
		   clearTimeout(id);
		}
	     }}
	 />
   }
   
   return <hh.run module=${
      <hh.module timetowait>
	<hh.emit timetowait value=${attrs.value} apply=${attrs.apply}/>
	${exec}
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
	   setTimeout(this.notifyAndReact, this.value.TIMEOUT);
	}}/>
	${lang.expandChildren(fargs)}
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
	<hh.local INTERVAL_BOOKKEEPING=${{initValue: -1}} TIMEOUT>
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
	</hh.local>
      </hh.trap>;
   } else {
      ret = <hh.local TIMEOUT>
	<hh.loop>
	  ${_mk_timeout(arguments)}
	</hh.loop>
      </hh.local>;
   }

   return ret;
}

exports.INTERVAL = INTERVAL;
