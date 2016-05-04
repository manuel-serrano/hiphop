"use hopscript";

var hh;
var G;
var color_id = 0;

function Candy() {
   this.color = "hsl(" + 360 * Math.random() + ", 50%, 50%);"
   this.radius = Math.random() * 25 + 10;
   this.x = 0;
   this.y = 0;

   while (this.x < 0 + this.radius || this.y < 0 + this.radius) {
      this.x = Math.random() * G.width - this.radius;
      this.y = Math.random() * G.height - this.radius;
   }

   this.init_direction();
   this.color_id = color_id++;
}

Candy.prototype.init_direction = function() {
   do {
      let ndx = (Math.random() * 6) - 3;
      let ndy = (Math.random() * 6) - 3;

      if(ndx != 0 || ndy != 0) {
	 this.dx = ndx;
	 this.dy = ndy;

	 return;
      }
   } while (true);
}

Candy.prototype.move = function() {
   this.x += this.dx;
   this.y += this.dy;

   if(this.x <= this.radius || this.x >= G.width - this.radius) {
      this.dx = -this.dx;
      this.x += this.dx;
   }
   if(this.y <= this.radius || this.y >= G.height - this.radius) {
      this.dy = -this.dy;
      this.y += this.dy;
   }

   G.ctx.fillStyle = this.color;
   G.ctx.font = this.font;

   G.ctx.beginPath();
   G.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
   G.ctx.fillStyle = this.color;
   G.ctx.fill();
   this.crashed = false;
}

Candy.prototype.crash_neighbour = function(walk_list) {
   var neighbour;
   var dx;
   var dy;
   var len;

   for (let i in walk_list) {
      neighbour = walk_list[i];
      dx = this.x - neighbour.x;
      dy = this.y - neighbour.y;
      len = Math.sqrt(dx * dx + dy * dy);

      if (neighbour == this)
	 continue;
      if (len < this.radius + neighbour.radius) {
	 if (neighbour.color_id > this.color_id) {
	    this.color_id = neighbour.color_id;
	    this.color = neighbour.color;
	 } else {
	    neighbour.color_id = this.color_id;
	    neighbour.color = this.color;
	 }

	 this.crashed = true;
	 this.dx = -this.dx + Math.random();
	 this.dy = -this.dy + Math.random();

	 if (!neighbour.crashed) {
	    neighbour.crashed = true;
	    neighbour.dx = -neighbour.dx + Math.random();
	    neighbour.dy = -neighbour.dy + Math.random();
	 }
	 break;
      }
   }
}

function CANDY(attr) {
   let candy = new Candy();

    return  <hh.loopeach signal_name="go">
       <hh.atom func=${self => self.move()}
		arg=${candy}/>
       <hh.emit signal_name="walk" arg=${candy}/>
       <hh.atom func=${(self, wl) => self.crash_neighbour(wl)}
		arg0=${candy}
		arg1=${hh.value("walk")}/>
     </hh.loopeach>;
}

exports.resume = function() {
   G.timer = setInterval(function() {
      G.machine.react();
   }, G.speed);
}

exports.pause = function() {
   if(G.timer) {
      clearInterval(G.timer);
      G.timer = false;
   } else {
      exports.resume();
   }
}

exports.set_speed = function(speed) {
   G.speed = ~~speed;

   if(G.timer) {
      clearInterval(G.timer);
      exports.resume();
   }
}

exports.add_candy = function() {
   G.machine.getElementById("candies").appendChild(<candy/>);
}

exports.start = function(g, speed) {
   function _combine(acc, n) {
      acc.push(n);
      return acc;
   }

   G = g;
   hh = require("hiphop");
   G.ctx = G.getContext("2d");
   exports.set_speed(speed);
   G.machine = new hh.ReactiveMachine(
      <hh.Module>
	<hh.localsignal name="go">
	  <hh.localsignal name="walk"
			  combine_with=${_combine}
			  reinit_func=${() => []}>
	    <hh.parallel id="candies">
	      <hh.loop>
	        <hh.atom func=${function() {
	    	 G.ctx.clearRect( 0, 0, G.width, G.height )}}/>
	        <hh.emit signal_name="go"/>
	        <hh.pause/>
	      </hh.loop>
	      <candy/>
	    </hh.parallel>
	  </hh.localsignal>
	</hh.localsignal>
      </hh.Module>, "Candy Crash");
   exports.resume();
}
