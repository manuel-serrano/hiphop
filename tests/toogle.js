"use hopscript"

var hh = require("hiphop");

function bool_and(x, y) {
   return x && y
}

function bool_or(x, y) {
   return x || y
}

function plus(x, y) {
   return x + y
}

var prg = <hh.module SEQ=${{initValue: 1, combine: plus}}
		     STATE1=${{initValue: false, combine: bool_or}}
		     STATE2=${{initValue: false, combine: bool_and}} S TOOGLE>
  <hh.loop>
    <hh.sequence>
      <hh.emit SEQ apply=${function() {return this.SEQ.preval + 1}}/>
      <hh.emit STATE1 value=${true} />
      <hh.emit STATE1 value=${false} />
      <hh.emit STATE2 value=${true} />
      <hh.emit STATE2 value=${false} />
      <hh.if pre S>
	<hh.emit TOOGLE value=${true} />
	<hh.sequence>
	  <hh.emit TOOGLE value=${false} />
	  <hh.emit S/>
	</hh.sequence>
      </hh.if>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "toogle");
