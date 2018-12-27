"use hiphop"
"use hopscript"

hiphop module mod( out O, var n, var m ) {
   emit O( n + m );
}
    
hiphop machine mach( O combine (x, y) => x + y ) {
   fork {
      run mod( m = 5, n = 10, ... );
   } par {
      run mod( n = 100, m = 123, ... );
   }
}

mach.addEventListener( "O", evt => console.log( evt.nowval ) );
mach.react();
