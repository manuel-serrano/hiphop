// F;G vs G;F where the cycle can only be cut cheaply at the n wires
// between F and G ("black box" F and G).
//
//     Y = C ? G(F(X)) : F(G(X))          (X, Y: n-bit words, one signal per bit)
//
// As in fg.hh.js, F and G are each `run` exactly once and wired together
// through a C-controlled multiplexer. The difference is the shape of F and
// G: every output bit is computed by its OWN chain of xor gates over many
// input bits, and no gate is shared between output bits:
//
//   F(x)_j = xor of x_i for all i != j+1     (indices mod n; every input
//                                             reaches n-1 outputs)
//   G(x)_j = xor of x_i for all i <= j       (prefix parity)
//
// So every F/G output is reached from many inputs along disjoint paths, and
// each route wire FO_j -> GI_j (or GO_j -> FI_j) is a single edge. The n
// cycles  FI_j -> FO_j -> GI_j -> GO_j -> FI_j  are edge-disjoint, so any
// feedback edge set needs at least n edges, and cutting the n route wires
// of one direction achieves that minimum. (The default GreedyFAS cuts
// 2n-3 route wires, some in each direction, but all of them between F
// and G.)
//
// For a fixed C, the active data path crosses the cut wires at most once,
// so 3-valued unrolling from bottom is stable after 2 steps, whatever n is.
// The naive cycle removal still makes one copy per cut.
//
// n must be >= 3 (for n = 2, F is the identity and F;G = G;F).
import * as hh from "@hop/hiphop";

const range = n => [...Array(n).keys()];
const names = (prefix, n) => range(n).map(i => prefix + i);

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

const id = ([a]) => a;
const xor = ([a, b]) => a !== b;

// target = xor of ins, as a chain of 2-input xor gates with private
// intermediate signals prefix1, prefix2, ...
function xorChain(ins, target, prefix) {
   if (ins.length === 1) {
      return { locals: [], stmts: [ifTree(ins, id, target)] };
   } else {
      const locals = range(ins.length - 2).map(k => prefix + (k + 1));
      const acc = [ins[0], ...locals];
      const outs = [...locals, target];
      const stmts = range(ins.length - 1)
         .map(k => ifTree([acc[k], ins[k + 1]], xor, outs[k]));
      return { locals, stmts };
   }
}

// a module whose output j is the xor of the inputs selected by sel(j)
function makeXorModule(n, sel, prefix) {
   const chains = range(n).map(j =>
      xorChain(names("I", n).filter((_, i) => sel(i, j)), `O${j}`, `${prefix}${j}_`));
   const locals = chains.flatMap(c => c.locals);
   const stmts = chains.flatMap(c => c.stmts);
   const body = hiphop { fork ${stmts} };

   return hiphop module() {
      in ... ${names("I", n)};
      out ... ${names("O", n)};
      ${locals.length > 0 ? hiphop { signal ... ${locals}; ${body} } : body}
   }
}

const makeF = n => makeXorModule(n, (i, j) => i !== (j + 1) % n, "P");
const makeG = n => makeXorModule(n, (i, j) => i <= j, "Q");

// callee signal -> caller signal
const bindings = (n, prefix) => Object.fromEntries([
   ...names("I", n).map(s => [s, prefix + s]),
   ...names("O", n).map(s => [s, prefix + s])]);

const route = (src, dst) => hiphop { if (this[src].now) { emit ${dst}(); } };

function FGbb(n) {
   if (n < 3) {
      throw new RangeError("FGbb: n must be >= 3");
   }

   const F = makeF(n);
   const G = makeG(n);

   const FthenG = range(n).flatMap(i =>
      [route(`X${i}`, `FI${i}`), route(`FO${i}`, `GI${i}`), route(`GO${i}`, `Y${i}`)]);
   const GthenF = range(n).flatMap(i =>
      [route(`X${i}`, `GI${i}`), route(`GO${i}`, `FI${i}`), route(`FO${i}`, `Y${i}`)]);

   const locals = [...names("FI", n), ...names("FO", n), ...names("GI", n), ...names("GO", n)];

   return hiphop module() {
      in C;
      in ... ${names("X", n)};
      out ... ${names("Y", n)};
      signal ... ${locals};

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
   }
}

const N = 3;

export const mach = new hh.ReactiveMachine(FGbb(N), { name: "fgbb" });

mach.outbuf = "";

for (const c of [false, true]) {
   for (let x = 0; x < (1 << N); x++) {
      const inputs = { C: c };
      range(N).forEach(i => inputs["X" + i] = !!(x & (1 << i)));
      Object.keys(inputs).forEach(k => {
         if (!inputs[k]) delete inputs[k];
      });
      mach.react(inputs);
      const y = range(N).reduce((y, i) => y + (mach.signals["Y" + i].now ? 1 << i : 0), 0);
      mach.outbuf += `C=${c ? 1 : 0} X=${x} Y=${y}\n`;
   }
}

if (process.env.HIPHOP_TEST) {
   console.log(mach.outbuf);
}
