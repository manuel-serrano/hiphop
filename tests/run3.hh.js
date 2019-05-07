"use hiphop"
"use hopscript"

const gameTimeout = 100;

function Timer( timeout ) { 
   return hiphop module( tmt ) {
      async tmt {
	 this.timer = setTimeout(() => this.notify( "ok" ), timeout ); 
      } kill { 
	 clearTimeout( this.timer ); 
      }
   }
}
    
hiphop machine mach( O ) {
   signal tmt;
   
   fork {
      run ${Timer( gameTimeout )}( ... );
   } par {
      await( tmt.now );
      emit O( tmt.nowval );
   }
}

mach.addEventListener( "O", evt => console.log( evt.nowval ) );
mach.react();
mach.react();

