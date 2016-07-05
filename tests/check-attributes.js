"use hopscript"

var hh = require("hiphop");

try {
   <hh.let>
   </hh.let>
} catch (e) {
   console.log(e.message);
}


try {
   <hh.let>
     <hh.signal name="foo"/>
   </hh.let>
} catch (e) {
   console.log(e.message);
}

/* TODO: error could be trigger here (sig unexpected) */
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
