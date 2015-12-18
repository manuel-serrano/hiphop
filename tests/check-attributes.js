"use hopscript"

var hh = require("hiphop");

try {
   <hh.localsignal signal_name="foo">
   </hh.localsignal>
} catch (e) {
   console.log(e.message);
}

try {
   <hh.emit signal_name="foo" sig="werr"/>
} catch (e) {
   console.log(e.message);
}

try {
   <hh.emit func=${function(){}} />
} catch (e) {
   console.log(e.message);
}
