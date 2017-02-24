"use hopscript"

const hh = require("hiphop");

const abro =
    <hh.module name="abro" A B R O>
      <hh.loopeach R>
	<hh.parallel>
	  <hh.await A/>
	  <hh.await B/>
	</hh.parallel>
	<hh.emit O/>
      </hh.loopeach>
    </hh.module>;

const rabro =
      <hh.module name="rabro" AM BM RM OM>
	<hh.parallel>
	  <hh.run module=${abro} A=AM B=BM R=RM O=OM/>
	  <hh.await AM/>
	  <hh.await BM/>
	</hh.parallel>
	<hh.emit OM/>
      </hh.module>;

const main =
      <hh.module AM BM RM OM>
	<hh.parallel>
	  <hh.run module=${abro}/>
	  <hh.run module=${abro} A=AM B=BM R=RM O=OM/>
	  <hh.run module=${rabro}/>
	  <hh.await OM/>
	</hh.parallel>
      </hh.module>;

const m = new hh.ReactiveMachine(main);

m.debuggerOn("debug");

hh.batch(m);
