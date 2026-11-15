import * as hh from "@hop/hiphop";

// A bounded ring buffer whose state is held entirely in signals.
//
// Interface:
//   in  rem    remove the first element
//   in  add    append the value of inp
//   in  inp    the value to append
//   out top    the first element; emitted in every instant in which
//              the buffer is not empty
//   out err    emitted when adding to an full buffer 
//              or removing from an empty one
//   out slot0 ... slot{capacity-1}
//              the buffer's storage
//
// add and rem together on a full buffer remove the first element and
// append inp, so the buffer stays full. On an empty buffer, the added
// element passes straight through, so the buffer stays empty.
//
// Local state:
//   head   index of the first element
//   tail   index of the slot where the next element goes
//   full   presence only, emitted in every instant in which the buffer
//          is full
//
// The elements are the slots from head up to (not including) tail,
// around the ring; other slots are not part of the buffer, whatever
// they hold. head === tail means either empty or full, which full.pre
// disambiguates. full, rather than an "empty" flag, is used because
// .pre is false in the first instant, when the buffer is empty.
function Ring(capacity) {
   const slots = Array.from({ length: capacity }, (_, i) => `slot${i}`);
   const found = Array.from({ length: capacity }, (_, i) => `found${i}`);
   const inc = i => (i + 1) % capacity;
   const dec = i => (i - 1 + capacity) % capacity;

   // Updates head, tail and full, and detects errors.
   const control = hiphop {
      if (full.pre) {
         if (rem.now) {
            emit head(inc(head.preval));
            if (add.now) {
               emit tail(inc(tail.preval));
               emit full(true);
            }
         } else {
            if (add.now) { emit err("add full"); }
            emit full(true);
         }
      } else {
         if (rem.now) {
            if (head.preval === tail.preval) {
               if (add.now) {
                  emit head(inc(head.preval));
               } else {
                  emit err("rem empty");
               }
            } else {
               emit head(inc(head.preval));
            }
         }
         if (add.now) {
            emit tail(inc(tail.preval));
            if (!rem.now) {
               if (inc(tail.preval) === head.preval) { emit full(true); }
            }
         }
      }
   };

   // handle storing the values in the slots and the `top` signal
   function slotBranch(i) {
      const me = slots[i];
      return hiphop {
         if (tail.preval === i) {
            if (add.now) {
               if (full.pre) {
                  if (rem.now) { emit ${me}(inp.nowval); }
               } else {
                  emit ${me}(inp.nowval);
               }
            }
         }
         if (head.nowval === i) {
            if (full.now) {
               emit top(this[me].nowval);
            } else if (head.nowval !== tail.nowval) {
               emit top(this[me].nowval);
	    }
         }
      };
   }

  function search() {
    return hiphop {
      fork ${slots.map((_, i) => hiphop {
	if (head.nowval === i) {
	  if (this[slots[i]].nowval === search.nowval) {
	    emit ${found[i]}(true);
	    emit pos((i - head.nowval + capacity) % capacity);
	  }
	} else if (tail.nowval === i) {
	  if (this[found[dec(i)]].now) {
	    emit ${found[i]}(true);
	  }
	} else {
	  if (this[found[dec(i)]].now) {
	    emit ${found[i]}(true);
	  } else if (this[slots[i]].nowval === search.nowval) {
	    emit ${found[i]}(true);
	    emit pos((i - head.nowval + capacity) % capacity);
	  }
	}
      })}
    }
  }

   return hiphop module() {
      in rem; in add; in inp; in search;
      out top; out err; out pos;
      out ... ${slots};
      out ... ${found};
      out head = 0, tail = 0;
      out full;
     
     loop {
       fork {
	 ${control}
       } par {
	 fork ${slots.map((_, i) => slotBranch(i))}
       } par {
	 if (search.now) {
	   if (!(head.nowval === tail.nowval)) {
	     ${search()}
	   } else if (full.now) {
	     ${search()}
	   }
	 }
       }
       yield;
     }
   };
}

let step_count = 0;
function makeMachine(capacity) {
  step_count = 0;
  const m = new hh.ReactiveMachine(Ring(capacity), 
				   {name : `ring-buffer-${capacity}`, 
				    uncycle: false});
  m.outbuf = "new machine, capacity = " + capacity + "\n";
  m.ring_buffer_capacity=capacity;
  return m;
}

function step(m, input) {
  step_count += 1;
  m.outbuf += "step " + step_count + "\n";
  m.outbuf += "  input:   " + JSON.stringify(input) + "\n";
  const res = m.react(input);
  m.outbuf += "  emitted: " + JSON.stringify(res) + "\n";
  m.outbuf += "  buffer:  [" 
    + Array.from(
      { length: m.ring_buffer_capacity }, 
      (_, i) => {
	let slotcontent = m.signals[`slot${i}`].nowval;
	return (m.signals.head.nowval === i ? "h" : "")
	  + (m.signals.tail.nowval === i ? "t" : "")
	  + (slotcontent === undefined ? "_" : slotcontent)
      }
    ).join(",") 
    + "] "
    + (m.signals["full"].now ? "full" : "")
    + "\n"

}

const m1 = makeMachine(1);
step(m1, {});                                // empty
step(m1, { rem: true });                     // rem on empty: err
step(m1, { search: 0 });                     // search for 0 (not found)
step(m1, { add: true, inp: 1 });             // now full
step(m1, { add: true, inp: 2 });             // add on full: err
step(m1, { add: true, rem: true, inp: 3 });  // add+rem on full: replaces
step(m1, { search: 3 });                     // search for 3 (found)
step(m1, { search: 2 });                     // search for 2 (not found)
step(m1, { rem: true });                     // now empty
step(m1, { add: true, rem: true, inp: 4 });  // add+rem on empty: passes through
step(m1, { inp: 5 });                        // inp without add: ignored
step(m1, { rem: true });                     // still empty: err
step(m1, { add: true, inp: 6 });             // full again
step(m1, { rem: true });                     // now empty

const m3 = makeMachine(3);
step(m3, { add: true, inp: 11 })
step(m3, { add: true, inp: 22 })
step(m3, { search: 11 })
step(m3, { search: 22 })
step(m3, { search: 33 })
step(m3, { add: true, inp: 33 })
step(m3, { search: 11 })
step(m3, { search: 22 })
step(m3, { search: 33 })
step(m3, { rem: true })
step(m3, { search: 11 })
step(m3, { search: 22 })
step(m3, { search: 33 })

const m6 = makeMachine(6);
step(m6, { add: true, inp: 10 });
step(m6, { add: true, inp: 20 });
step(m6, { add: true, inp: 30 });
step(m6, { rem: true });
step(m6, { add: true, inp: 40 });
step(m6, { add: true, inp: 50 });
step(m6, { search: 10 })
step(m6, { search: 11 })
step(m6, { add: true, rem: true, inp: 60 });
step(m6, { add: true, inp: 70 });            // wraps to slot0
step(m6, { add: true, inp: 80 });            // now full
step(m6, { add: true, inp: 90 });            // add on full: err
step(m6, { search: 80 })
step(m6, { search: 30 })
step(m6, { search: 81 })
step(m6, { add: true, rem: true, inp: 100 }); // add+rem on full
step(m6, { rem: true });
step(m6, { rem: true });
step(m6, { inp: 110 });                      // inp without add: ignored
step(m6, { rem: true });
step(m6, { add: true, rem: true, inp: 120 });
step(m6, { rem: true });
step(m6, { rem: true });
step(m6, { rem: true });                     // now empty
step(m6, { rem: true });                     // rem on empty: err
step(m6, { add: true, rem: true, inp: 130 }); // add+rem on empty: passes through
step(m6, { rem: true });                     // still empty: err
step(m6, { add: true, inp: 140 });
step(m6, { rem: true });                     // now empty

export const mach = m1;
mach.outbuf += "\n" + m3.outbuf + "\n" + m6.outbuf
