"use hopscript"

const hh = require("hiphop");

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
   return <hh.loop>
     <timeout value=${attrs.value} apply=${attrs.apply}/>
     ${Array.prototype.slice.call(arguments, 1, arguments.length)}
   </hh.loop>
}

exports.INTERVAL = INTERVAL;
