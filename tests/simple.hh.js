"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( OK, O, A, B, C, BBBB, NEVER, in STOP, in AIN ) {
   abort( STOP.now ) {
      loop {
	 JMP: {
	    emit O();
	    FOO: {
	       break JMP;
	       yield;
	       yield;
	    }
	 }
	 emit O();

	 if( O.now ) emit OK();
	 yield;
	 emit O();
	 if( O.now ) emit OK();
	 yield;

	 fork {
	    emit A();
	    yield;
	    emit C();
	 } par {
	    emit B();
	 } par {
	    emit BBBB();
	 }
      }
   }
   emit NEVER();
   yield;
   await( STOP.now );
   emit B();
   await( AIN.now );
   if( AIN.now ) {
      emit C();
   }
}

hiphop module prg2( O, V ) {
   loop {
      yield;
      yield;
      emit O();
      yield;
      emit O();

      if( O.now ) {
	 emit V();
      }
   }
   emit O();
}

hiphop module prg3( O ) {
   {
      yield;
      emit O();
   }
   emit O();
}

hiphop module prg4( OK, O ) {
   emit O();
   if( O.now ) {
      emit OK();
   }
}

hiphop module prg5( OK, O ) {
   if( O.now ) {
      emit OK();
   }
}

var machine = new hh.ReactiveMachine( prg, "FOO" );
machine.debug_emitted_func = console.log

console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react STOP" );
machine.inputAndReact( "STOP", undefined );
console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react" );
machine.react();
console.log( "will react STOP" );
machine.inputAndReact( "STOP", undefined )
console.log( "will react" );
machine.inputAndReact( "AIN", undefined )
console.log( "will react" );
machine.react();

var m2 = new hh.ReactiveMachine( prg2, "2" );
m2.debug_emitted_func = console.log
console.log( "m2" )
m2.react();
m2.react();
m2.react();
m2.react();
m2.react();

var m3 = new hh.ReactiveMachine( prg3, "3" );
m3.debug_emitted_func = console.log
console.log( "m3" )
m3.react();
m3.react();
m3.react();
m3.react();
m3.react();

var m4 = new hh.ReactiveMachine( prg4, "4" );
m4.debug_emitted_func = console.log
console.log( "m4" )
m4.react()
m4.react()
m4.react()
m4.react()
m4.react()

var m5 = new hh.ReactiveMachine( prg5, "5" );
m5.debug_emitted_func = console.log
console.log( "m5" )
m5.react()
m5.react()
m5.react()
m5.react()
m5.react()
