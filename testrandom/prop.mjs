import * as hh from "@hop/hiphop";
import * as hhapi from "@hop/hiphop/lib/ast.js";
import beautify from 'js-beautify';

function run(mach, count = 10) {
   const res = [];
   let sigs = [];
   mach.debug_emitted_func = emitted => {
      sigs = emitted.map(n => n);
   }
   for (let i = 0; i < count; i++) {
      try {
	 sigs = "";
	 mach.react();
	 res.push(sigs);
      } catch(e) {
	 res.push("error");
	 return res;
      }
   }
   return res;
}

hhapi.Module.prototype.dump = function() {
   return { node: "module", children: this.children.map(c => c.dump()) };
}
hhapi.Nothing.prototype.dump = function(){ return { node: "nothing" }; }
hhapi.Pause.prototype.dump = function() { return { node: "pause" }; }
hhapi.Sequence.prototype.dump = function() {
   return { node: "seq", children: this.children.map(c => c.dump()) };
}
hhapi.Fork.prototype.dump = function() {
   return { node: "par", children: this.children.map(c => c.dump()) };
}
hhapi.Loop.prototype.dump = function() {
   return { node: "loop", children: this.children.map(c => c.dump()) };
}

function failure(prog, mach0, machN, msg) {
   return `${beautify.js(JSON.stringify(prog.dump()), { indent_size: 2, space_in_empty_paren: true })}`
      + `"${mach0.name()}"/"${machN.name()}": ${msg}`;
}

function equal(x, y) {
   if ((x instanceof Array) && (y instanceof Array)) {
      if (x.length === y.length) {
	 for (let j = 0; j < x.length; j++) {
	    if (!equal(x[j], y[j])) {
	       return false;
	    }
	 }
	 return true;
      } else {
	 return false;
      }
   } else {
      return x === y;
   }
}

function makeProp(...machCtor) {
   return prog => {
      const machs = machCtor.map(ctor => ctor(prog));
      const v0 = run(machs[0]);

      for (let i = 1; i < machCtor.length; i++) {
	 const v = run(machs[i]);

	 for (let r = 0; r < Math.max(v0.length, v.length); r++) {
	    if (r >= v0.length || r >= v.length) {
	       return failure(prog, machs[0], machs[i], `Number of reactions differs`);
	    }
	    if (!equal(v0[r], v[r])) {
	       return failure(prog, machs[0], machs[i], `Results differ at reaction #${r}\n  v0=${v0[r]}\n  vr=${v[r]}`);
	    }
	 }
      }
   }
   return false;
}

export const prop = makeProp(
   prg => new hh.ReactiveMachine(prg, { name: "colin" }),
   prg => new hh.ReactiveMachine(prg, { name: "new", compiler: "new", unrollLoops: true, syncReg: true }),
   prg => new hh.ReactiveMachine(prg, { name: "new-nounroll", compiler: "new", unrollLoops: false, syncReg: true }));





