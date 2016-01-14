"use hopscript"

var hh = require("hiphop")

var m =
    <hh.reactivemachine name="foo">
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.emit signal_name="O"/>
	<hh.pause/>
      </hh.loop>
    </hh.reactivemachine>;

m.addEventListener("O", function(evt) {
   console.log("first", evt);
   evt.signal = "foo bar";
});

m.addEventListener("O", function(evt) {
   evt.stopPropagation();
   console.log("second", evt);
});

m.addEventListener("O", function(evt) {
   console.log("third", evt);
});

exports.prg = m;
