// F;G vs G;F in HipHop, parameterised by the word width n.
//
//     Y = C ? G(F(X)) : F(G(X))          (X, Y: n-bit words, one signal per bit)
//
// F and G are HipHop modules generated for a given n (staging) and each is
// `run` exactly ONCE.  Their n-bit data paths are wired together through a
// C-controlled multiplexer, giving the classic false cycle F -> G -> F: the
// circuit is cyclic but the program is constructive, because C only ever
// selects one direction.
//
//   F(x) = x + 1                ripple-carry incrementer
//   G(x) = 3 * x                (variant "mul3": one small cycle per bit,
//                                 since carries only flow upwards)
//   G(x) = 3 * rev(x)           (variant "rev3": bit reversal sends high bits
//                                 back down, so the whole data path is one
//                                 big strongly connected component)
import * as hh from "@hop/hiphop";

const range = n => [...Array(n).keys()];
const names = (prefix, n) => range(n).map(i => prefix + i);

// declare the local signals `sigs` around `body`
function withSignals(sigs, body) {
   if (sigs.length === 0) {
      return body;
   } else {
      return hiphop { signal ${sigs[0]}; ${withSignals(sigs.slice(1), body)} };
   }
}

// emit `target` iff f(statuses of `sigs`), as a decision tree of pure tests
function ifTree(sigs, f, target, vals = []) {
   if (vals.length === sigs.length) {
      return f(vals) ? hiphop { emit ${target}(); } : hiphop {};
   } else {
      const s = sigs[vals.length];
      const t = ifTree(sigs, f, target, [...vals, true]);
      const e = ifTree(sigs, f, target, [...vals, false]);
      return hiphop { if (this[s].now) { ${t} } else { ${e} } };
   }
}

const not = ([a]) => !a;
const id = ([a]) => a;
const and = v => v.every(x => x);
const xor = v => v.reduce((x, y) => x !== y, false);
const maj = v => v.filter(x => x).length >= 2;

// F(x) = x + 1:  O_i = I_i xor K_i,  K_{i+1} = I_i and K_i,  K_0 = 1
function makeF(n) {
   const K = names("K", n).slice(1);
   const bits = range(n).flatMap(i => i === 0
      ? [ifTree(["I0"], not, "O0"), ...(n > 1 ? [ifTree(["I0"], id, "K1")] : [])]
      : [ifTree([`I${i}`, `K${i}`], xor, `O${i}`),
         ...(i < n - 1 ? [ifTree([`I${i}`, `K${i}`], and, `K${i + 1}`)] : [])]);

   return hiphop module() {
      in ... ${names("I", n)};
      out ... ${names("O", n)};
      ${withSignals(K, hiphop { fork ${bits} })}
   }
}

// G(y) = 3 * y = y + (y << 1), with y = x or y = rev(x)
function makeG(n, variant) {
   const y = i => `I${variant === "rev3" ? n - 1 - i : i}`;
   const K = names("K", n).slice(2);
   const bits = range(n).flatMap(i => {
      if (i === 0) {
         return [ifTree([y(0)], id, "O0")];
      } else {
         const ins = i === 1 ? [y(1), y(0)] : [y(i), y(i - 1), `K${i}`];
         return [ifTree(ins, xor, `O${i}`), ...(i < n - 1 ? [ifTree(ins, maj, `K${i + 1}`)] : [])];
      }
   });

   return hiphop module() {
      in ... ${names("I", n)};
      out ... ${names("O", n)};
      ${withSignals(K, hiphop { fork ${bits} })}
   }
}

// callee signal -> caller signal
const bindings = (n, prefix) => Object.fromEntries([
   ...names("I", n).map(s => [s, prefix + s]),
   ...names("O", n).map(s => [s, prefix + s])]);

const route = (src, dst) => hiphop { if (this[src].now) { emit ${dst}(); } };

export function FG(n, variant = "mul3") {
   const F = makeF(n);
   const G = makeG(n, variant);

   // all routing branches in ONE fork: sequencing them per bit would add
   // control dependencies against the data flow
   const FthenG = range(n).flatMap(i =>
      [route(`X${i}`, `FI${i}`), route(`FO${i}`, `GI${i}`), route(`GO${i}`, `Y${i}`)]);
   const GthenF = range(n).flatMap(i =>
      [route(`X${i}`, `GI${i}`), route(`GO${i}`, `FI${i}`), route(`FO${i}`, `Y${i}`)]);

   const locals = [...names("FI", n), ...names("FO", n), ...names("GI", n), ...names("GO", n)];

   return hiphop module() {
      in C;
      in ... ${names("X", n)};
      out ... ${names("Y", n)};

      ${withSignals(locals, hiphop {
         loop {
            fork {
               run ${F}() ${bindings(n, "F")}
            } par {
               run ${G}() ${bindings(n, "G")}
            } par {
               if (C.now) {
                  fork ${FthenG}
               } else {
                  fork ${GthenF}
               }
            }
            yield;
         }
      })}
   }
}

export const mach = new hh.ReactiveMachine(FG(2), { name: "uncycle-backward-edges" });

mach.outbuf = "";

for (const c of [false, true]) {
   for (let x = 0; x < 8; x++) {
      const inputs = { C: c, X0: !!(x & 1), X1: !!(x & 2) };
      Object.keys(inputs).forEach(k => {
         if (!inputs[k]) delete inputs[k];
      });
      mach.react(inputs);
      const y = (mach.signals.Y0.now ? 1 : 0)
         + (mach.signals.Y1.now ? 2 : 0);
      mach.outbuf += `C=${c ? 1 : 0} X=${x} Y=${y}\n`;
   }
}

if (process.env.HIPHOP_TEST) {
   console.log(mach.outbuf);
}
