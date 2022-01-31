"use @hop/hiphop"
"use hopscript"

hiphop module mod(n, m) {
   out O;
   emit O(n + m);
}
    
hiphop machine mach() {
   out O combine (x, y) => x + y;
   fork {
      run mod(10, 5) { * };
   } par {
      run mod(100, 123) { * };
   }
}

mach.addEventListener("O", evt => console.log(evt.nowval));
mach.react();
