"use @hop/hiphop";
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop interface I1 { inout A, B, C };
hiphop interface I2 { inout D } extends I1;

hiphop module M2() implements I2 {
   emit A( 10 );
   emit D( 23 );
}

hiphop module M1() implements I1 {
   inout Z;
   run M2( D as Z, ... );
}

const m = new hh.ReactiveMachine( M1 );

m.addEventListener( "A", v => console.log( "got A", v.signalValue ));
m.addEventListener( "Z", v => console.log( "got Z", v.signalValue ) );

m.react();
