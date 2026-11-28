import * as hh from "@hop/hiphop";

/*

The idea with this program is that we have a person (the caret)
exploring a maze and, as they walk around in the maze, more of the
maze is revealed. The output shows the person as the `^` character and
they move left to right across the top of the maze, with `*` showing
dark squares and `w` showing the walls.

The cell `wall(x,y)` is true if there is a wall on that spot in the
grid. The signals `px` and `py` are the current position of the person
(the caret). The signal `light(x,y)` is true if that cell is visible
with the person at their current position and false if not.  The
`seen(x,y)` signals carry the light forward from reaction to reaction.

This should be a cyclic circuit because the light could be coming from
any of the directions and it needs to be propagated; the cycle is
broken by the position of the person. That is, light is propagated
only from adjacent cells (of the 8 neighbors) that would be visible
(via the `alongRay` predicate).

*/

function lit(x,y) { return `lit${x},${y}` }
function seen(x,y) { return `seen${x},${y}` }
function wall(x,y) { return `wall${x},${y}` }
function iota(size) { return Array.from({length: size}, (_, i) => i) }

// This function determines information about the straight line path from
// (x,y) to (px,py). In particular, if we take a step from (x,y) to
// (nx,ny), are we on that straight line (or is one of the other
// neighbors of (x,y) on that line instead)? If it is, then we want to
// propagate the light signals and if not, we don't want to.
// 
// Usually, there is just one neighbor that is on the line but in the
// special case that there is a line of slope 1 (or -1) between (x,y) and
// (px,py) there are two cells that are both on the line so we accept
// both of them.
function alongLine(nx, ny, x, y, px, py) {
  const dx = x - px, dy = y - py;
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  const steps = d => 2 * Math.abs(d) === m ? [0, Math.sign(d)] : [Math.round(d / m)];
  return steps(dx).includes(x - nx) && steps(dy).includes(y - ny);
}

function Illumination(w,h) {
  return hiphop module() {
    inout ... ${iota(w).flatMap(x => iota(h).map(y => lit(x,y)))} = false combine (x, y) => x || y;
    inout ... ${iota(w).flatMap(x => iota(h).map(y => seen(x,y)))} = false combine (x, y) => x || y;
    in ... ${iota(w).flatMap(x => iota(h).map(y => wall(x,y)))};
    in px, py;
    loop {
      fork ${iota(w).map(x => iota(h).map(y => {
	let dirs = [[x-1,y],[x+1,y],[x,y-1],[x,y+1],[x-1,y-1],[x+1,y+1],[x-1,y+1],[x+1,y-1]]
	    .filter(([x,y]) => x >= 0 && x < w && y >= 0 && y < h);
	let dist = (x1,y1,x2,y2) => Math.max(Math.abs(x1 - x2),Math.abs(y1 - y2));
	return hiphop {
	  if (x === this.px.nowval && y === this.py.nowval) {
	    emit ${lit(x,y)}(true);
	  } else {
	    let minDist = Math.min(...dirs.map(([x,y]) => dist(x,y,px.nowval,py.nowval)));
	    fork ${dirs.map(([nx,ny]) => hiphop {
	      if (alongLine(nx, ny, x, y, this.px.nowval, this.py.nowval)) {
		if (!this[wall(nx,ny)].nowval) {
		  if (!this[wall(x,y)].nowval) {
		    if (this[lit(nx,ny)].now) {
		      emit ${lit(x,y)}(true)
		    }
		  }
		}
	      }
	    })}
	  }
	}
      }))} ;
      fork ${iota(w).map(x => iota(h).map(y => 
	hiphop {
	  if (this[lit(x,y)].now) {
	    emit ${seen(x,y)}(true);
	  }
	  if (this[seen(x,y)].preval) {
	    emit ${seen(x,y)}(true);
	  }
	}
      ))} ;
      yield;
    }
  }
}

function show(size,signals) {
  let output = "";
  let line = "";
  for (let y=0; y<size; y++) {
    line = "";
    for (let x=0; x<size; x++) {
      if (signals.px === x && signals.py === y) {
	line += "^";
      } else if (signals[wall(x,y)] === true) {
	line += "w";
      } else if (signals[seen(x,y)] === true) {
	line += " ";
      } else {
	line += "*";
      }
    }
    output += line + "\n";
  }
  return output;
}

const size = 10;
export const mach = new hh.ReactiveMachine(Illumination(size,size))
const signals = {px: 0, py: 0};
for (let x=0; x<size; x++) {
  for (let y=0; y<size; y++) {
    if (x % 4 == 2) {
      if (y >= 2 && y <= 7) {
	signals[wall(x,y)]=true;
      }
    }
  }
}
signals[wall(3,2)]=true;
signals[wall(4,2)]=true;
signals[wall(5,7)]=true;

mach.outbuf = show(size, signals);
for (let i=0; i<size; i++) {
  const after = mach.react(signals);
  mach.outbuf += ("\nreaction " + i + "\n");
  mach.outbuf += show(size, Object.assign({},signals, after));
  signals.px++;
}

