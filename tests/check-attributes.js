"use hopscript"

var hh = require("hiphop");

try {
   <hh.localsignal signal="foo">
   </hh.localsignal>
} catch (e) {
   console.log(e.message);
}

try {
   <hh.emit signal="foo" sig="werr"/>
} catch (e) {
   console.log(e.message);
}

try {
   <hh.emit func=${function(){}} />
} catch (e) {
   console.log(e.message);
}
