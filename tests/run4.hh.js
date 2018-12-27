"use hiphop"
"use hopscript"

hiphop module mod( out O, var n ) {
   emit O( n );
}
    
hiphop machine mach( O combine (x, y) => x + y ) {
   fork {
      run mod( n = 10, ... );
   } par {
      run mod( n = 100, ... );
   }
}

mach.addEventListener( "O", evt => console.log( evt.nowval ) );
mach.react();
