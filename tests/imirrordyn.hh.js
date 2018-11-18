"use hiphop";

const hh = require( "hiphop" );

const SIGS = [ {name: "I", direction: "in"}, {name: "O", direction: "out"} ];

const Intf = <hh.interface>
  ${SIGS.map( sp => <hh.signal name=${sp.name} direction=${sp.dir}/> )}
</hh.interface>

hiphop module M1() implements Intf {
   if( I.now ) emit O();
}

hiphop module M2( out OK ) implements mirror Intf {
   emit I();
   if( O.now ) emit OK();
}

hiphop module Main( OK ) {
   signal implements Intf;

   fork {
      run M1( ... );
   } par {
      run M2( OK, ... );
   }
}

const m = new hh.ReactiveMachine( Main );
m.addEventListener( "OK", v => console.log( "got OK" ) );

m.react();
