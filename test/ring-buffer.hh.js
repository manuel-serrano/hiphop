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
   const inc = i => (i + 1) % capacity;

   // Updates head, tail and full, and detects errors.
   const control = hiphop loop {
      if (full.pre) {
         if (rem.now) {
            emit head(inc(head.preval));
            if (add.now) {
               emit tail(inc(tail.preval));
               emit full();
            }
         } else {
            if (add.now) { emit err(); }
            emit full();
         }
      } else {
         if (rem.now) {
            if (head.preval === tail.preval) {
               if (add.now) {
                  emit head(inc(head.preval));
               } else {
                  emit err();
               }
            } else {
               emit head(inc(head.preval));
            }
         }
         if (add.now) {
            emit tail(inc(tail.preval));
            if (!rem.now) {
               if (inc(tail.preval) === head.preval) { emit full(); }
            }
         }
      }
      yield;
   };

   // handle storing the values in the slots and the `top` signal
   function slotBranch(i) {
      const me = slots[i];
      return hiphop loop {
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
         yield;
      };
   }

   return hiphop module() {
      in rem; in add; in inp;
      out top; out err;
      out ... ${slots};
      signal head = 0, tail = 0;
      signal full;

      fork ${[control, ...slots.map((_, i) => slotBranch(i))]}
   };
}

function makeMachine(capacity) {
   const m = new hh.ReactiveMachine(Ring(capacity), 
				    {name : `ring-buffer-${capacity}`, 
				     uncycle: true});
   m.state = { top: "absent", err: false, slots: new Array(capacity).fill(undefined) };
   m.addEventListener("top", e => m.state.top = e.nowval);
   m.addEventListener("err", () => m.state.err = true);
   for (let i = 0; i < capacity; i++) {
      m.addEventListener(`slot${i}`, e => m.state.slots[i] = e.nowval);
   }
   return m;
}

let log = "";
const show = v => v === undefined ? "_" : String(v);

function describe(input) {
   const parts = [];
   if (input.add) parts.push(`add(${input.inp})`);
   else if ("inp" in input) parts.push(`inp(${input.inp})`);
   if (input.rem) parts.push("rem");
   return parts.length ? parts.join(" ") : "-";
}

function react(m, input) {
   m.state.top = "absent";
   m.state.err = false;
   m.react(input);
   const top = m.state.top === "absent" ? "top absent" : `top=${show(m.state.top)}`;
   return `${top}${m.state.err ? " err" : ""}`;
}

function step(m, input) {
   const res = react(m, input);
   log += `${describe(input).padEnd(14)} ${res.padEnd(16)} [${m.state.slots.map(show).join(" ")}]\n`;
}

function quickStep(m, input) {
   const res = react(m, input);
   log += `${describe(input).padEnd(14)} ${res}\n`;
}

function dumpSlots(m) {
   for (let i = 0; i < m.state.slots.length; i += 10) {
      log += `  slots ${String(i).padStart(2)}-${String(i + 9).padStart(2)}: `
         + m.state.slots.slice(i, i + 10).map(show).join(" ") + "\n";
   }
}

// Capacity 1: the head slot is also the last position.
const m1 = makeMachine(1);
log += "--- capacity 1\n";
step(m1, {});                                // empty
step(m1, { rem: true });                     // rem on empty: err
step(m1, { add: true, inp: 1 });             // now full
step(m1, { add: true, inp: 2 });             // add on full: err
step(m1, { add: true, rem: true, inp: 3 });  // add+rem on full: replaces
step(m1, { rem: true });                     // now empty
step(m1, { add: true, rem: true, inp: 4 });  // add+rem on empty: passes through
step(m1, { inp: 5 });                        // inp without add: ignored
step(m1, { rem: true });                     // still empty: err
step(m1, { add: true, inp: 6 });             // full again
step(m1, { rem: true });                     // now empty

// Capacity 6: wraparound, full and empty edge cases.
const m6 = makeMachine(6);
log += "--- capacity 6\n";
step(m6, { add: true, inp: 10 });
step(m6, { add: true, inp: 20 });
step(m6, { add: true, inp: 30 });
step(m6, { rem: true });
step(m6, { add: true, inp: 40 });
step(m6, { add: true, inp: 50 });
step(m6, { add: true, rem: true, inp: 60 });
step(m6, { add: true, inp: 70 });            // wraps to slot0
step(m6, { add: true, inp: 80 });            // now full
step(m6, { add: true, inp: 90 });            // add on full: err
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

// A larger buffer: fill it, operate while full, then empty it.
const LARGE = 10;
const mL = makeMachine(LARGE);
log += `--- capacity ${LARGE}: fill\n`;
for (let v = 1; v <= LARGE; v++) quickStep(mL, { add: true, inp: v });
dumpSlots(mL);
log += `--- capacity ${LARGE}: while full\n`;
quickStep(mL, { add: true, inp: LARGE + 1 });       // add on full: err
for (let v = LARGE + 1; v <= LARGE + 5; v++) {
   quickStep(mL, { add: true, rem: true, inp: v }); // add+rem on full
}
quickStep(mL, { add: true, inp: LARGE + 6 });       // still full: err
dumpSlots(mL);
log += `--- capacity ${LARGE}: empty\n`;
for (let k = 0; k < LARGE; k++) quickStep(mL, { rem: true });
quickStep(mL, { rem: true });                       // rem on empty: err
dumpSlots(mL);

export const mach = m1;
mach.outbuf = log;
