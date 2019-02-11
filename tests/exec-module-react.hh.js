"use hopscript"

hiphop module M1( a ) {
   emit a( 100 );
   async a {
      this.notify( 10 );
   }
}

hiphop machine m( a, b ) {
   run M1( a as b );
}

m.addEventListener( "a", e => console.log( "a=", e.nowval ) );
m.addEventListener( "b", e => console.log( "b=", e.nowval ) );

m.react();
m.react();
