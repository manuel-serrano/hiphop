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

mach.outbuf = "";
mach.addEventListener("O", evt => mach.outbuf += evt.nowval + "\n");
mach.react();

export { mach };
