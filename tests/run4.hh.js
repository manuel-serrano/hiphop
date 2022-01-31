"use @hop/hiphop";
"use hopscript";

hiphop module mod(n) {
   out O;
   emit O(n);
}
    
hiphop machine mach() {
   out O combine (x, y) => x + y;
   fork {
      run mod(10) { * };
   } par {
      run mod(100) { * };
   }
}

mach.addEventListener("O", evt => console.log(evt.nowval));
mach.react();
