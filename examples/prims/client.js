/*=====================================================================*/
/*    serrano/prgm/project/hiphop/prims/client.js                      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Jan 16 07:20:47 2016                          */
/*    Last change :  Tue Mar 29 11:58:59 2016 (serrano)                */
/*    Copyright   :  2016 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Prims client part                                                */
/*=====================================================================*/
"use hopscript";

/*---------------------------------------------------------------------*/
/*    Imports                                                          */
/*---------------------------------------------------------------------*/
var hh;
var G;

/*---------------------------------------------------------------------*/
/*    Num ...                                                          */
/*---------------------------------------------------------------------*/
function Num( G ) {
   this.G = G;
   this.value = G.count;
   this.color = G.predatorColor;
   this.font = `${G.font} ${G.fontSize}px`;
   this.eaten = 0;
   this.x = Math.random() *  G.width;
   this.y = Math.random() * G.height;

   this.init();
}

/*---------------------------------------------------------------------*/
/*    move ...                                                         */
/*---------------------------------------------------------------------*/
Num.prototype.move = function() {
   let G = this.G;
   
   // move the number
   this.x += this.dx;
   this.y += this.dy;

   if( this.x <= 0 || this.x >= G.width ) {
      this.dx = -this.dx;
      this.x += this.dx;
   }
   if( this.y <= 0 || this.y >= G.height ) {
      this.dy = -this.dy;
      this.y += this.dy;
   }

   // draw it on screen
   G.ctx.fillStyle = this.color;
   G.ctx.font = this.font;

   G.ctx.fillText( this.value, this.x, this.y );
}

/*---------------------------------------------------------------------*/
/*    init ...                                                         */
/*---------------------------------------------------------------------*/
Num.prototype.init = function() {
   this.prey = false;
   
   while( true ) {
      let ndx = (Math.random() * 6) - 3;
      let ndy = (Math.random() * 6) - 3;

      if( ndx != 0 || ndy != 0 ) {
	 this.dx = ndx;
	 this.dy = ndy;

	 return;
      }
   }
}
	 
/*---------------------------------------------------------------------*/
/*    computeMove ...                                                  */
/*---------------------------------------------------------------------*/
Num.prototype.computeMove = function( suspect, G ) {

   function gotoPrey( self ) {
      let px = self.prey.x, py = self.prey.y, x = self.x, y = self.y;
      let dx = px - x, dy = py - y;

      if( px < x ) {
	 self.dx = dx > - 5 ? dx : -4;
      } else {
	 self.dx = dx < 5 ? dx : 4;
      }
      
      if( py < y ) {
	 self.dy = dy > - 5 ? dy : -4;
      } else {
	 self.dy = dy < 5 ? dy : 4;
      }

      if( (Math.abs( (x + self.dx) - px) <= 4) && (Math.abs( (y + self.dy) - py) <= 4) ) {
	 self.eaten = 1 + self.eaten + self.prey.eaten;
	 let sz = self.eaten > 100 ? 100 : self.eaten;
	 let killed = self.prey;
	 self.font = `${sz + G.fontSize}px ${G.font}`;

	 self.init();
	 return killed;
      }

      return false;
   }

   function gotoNewPrey( self ) {
      self.prey = suspect;

      if( !suspect.predator ) {
	 suspect.predator = self;
	 suspect.color = G.preyColor;
      }

      return gotoPrey( self );
   }

   if( !this.prey ) {
      if( (this.value < suspect.value) && (suspect.value % this.value === 0) ) {
	 return gotoNewPrey( this );
      } else {
	 return false;
      }
   } else {
      if( this.prey.dead ) {
	 this.init();
	 return false;
      } else {
         return gotoPrey( this );
      }
   }
}

/*---------------------------------------------------------------------*/
/*    number ...                                                       */
/*---------------------------------------------------------------------*/
function number(G) {
   let num = new Num(G);
   var numid = "num" + num.value;
   G.count++;

   function prey(number) {
      let prey = false;

      number.find( function( other ) {
	 return (prey = num.computeMove( other, G ));
      });
      return prey;
   }

   let trap = TRAP Exit {
      LOOP {
	 AWAIT(NOW(killn) && NOW(numbers));
	 EMIT numbers(num);
	 EMIT killn(prey(VAL(numbers)));
	 IF (VAL(killn).indexOf(num) >= 0) {
	    ATOM {
	       num.dead = true;
	       G.mach.getElementById( "numbers" ).removeChild( trap );
	    }
	    EXIT Exit;
	 } ELSE {
	    IF (num.pery && VAL(killn).indexOf(num.prey) >= 0) {
	       ATOM {
		  num.init();
	       }
	    }
	    ATOM {
	       num.move();
	    }
	 }
      }
   }

   return trap;
}


/*---------------------------------------------------------------------*/
/*    prims ...                                                        */
/*---------------------------------------------------------------------*/
function prims( G ) {

   function reinit() {
      return [];
   }

   const reduce = function(acc, n) {
      if (n)
	 acc.push(n);
      return acc;
   }

   return MODULE (INOUT go,
		  INOUT killn COMBINE (reduce),
		  INOUT numbers COMBINE (reduce)) {
      FORK numbers {
	 LOOP {
	    ATOM {
	       G.ctx.clearRect( 0, 0, G.width, G.height )
	    }
	    EMIT killn([]);
	    EMIT numbers([]);
	    PAUSE;
	 }
      } PAR {
	 ${number(G)}
      }
   }
}

/*---------------------------------------------------------------------*/
/*    addNumber ...                                                    */
/*---------------------------------------------------------------------*/
function addNumber( G ) {
   G.mach.getElementById( "numbers" )
      .appendChild( number(G) );
}
   
/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.addNumber = function( num ) {
   while( num-- >  0 ) {
      addNumber(  G );
   }
}

exports.resume = function() {
   G.timer = setInterval( function() {
      G.mach.react();
         
   }, G.speed  );
}
   
exports.pause = function() {
   if( G.timer ) {
      clearInterval( G.timer );
      G.timer = false;
   } else {
      exports.resume();
   }
}

exports.setSpeed = function( speed ) {
   G.speed = ~~speed;
   
   if( G.timer ) {
      clearInterval( G.timer );
      exports.resume();
   }
}

exports.start = function( g, speed ) {
   G = g;
   hh = require( "hiphop" );

   G.ctx = G.getContext( "2d" );
   G.predatorColor = "#00a";
   G.preyColor = "#f00";
   G.font = "sans";
   G.fontSize = 10;
   G.count = 2;

   exports.setSpeed( speed );
   G.mach = new hh.ReactiveMachine(prims(G));
   exports.resume();
}
