import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";

export { shrinker };

function shrinker(prog) {
   if (typeof prog === "number" && Number.isInteger(prog)) {
      return shrinkInt(prog);
   } else if (prog instanceof Array) {
      return shrinkArray(prog);
   } else if (prog instanceof hhapi.$ASTNode) {
      return prog.shrink();
   } else {
      throw new Error("cannot shrink " + prog.constructor.name);
   }
}

function shrinkASTNode(ctor, children) {
   if (children.length === 0) {
      return [hh.NOTHING({})];
   } else if (children.length === 1) {
      return children;
   } else {
      const el = shrinkArray(children);
      return el.map(a => ctor({}, a));
   }
}

hhapi.$ASTNode.prototype.shrink = function() {
   throw new Error(`shrink not implemented for "${this.constructor.name}"`);
}
hhapi.Module.prototype.shrink = function() {
   const el = shrinkArray(this.children);
   return el.map(a => {
      if (a.length === 0) {
	 return hh.MODULE({}, [ hh.NOTHING({}) ]);
      } else {
	 return hh.MODULE({}, a);
      }
   });
}
hhapi.Nothing.prototype.shrink = function() {
   return [];
}
hhapi.Pause.prototype.shrink = function() {
   return [hh.NOTHING({})];
}
hhapi.Sequence.prototype.shrink = function() {
   return shrinkASTNode(hh.SEQUENCE, this.children);
}
hhapi.Fork.prototype.shrink = function() {
   return shrinkASTNode(hh.FORK, this.children);
}
hhapi.Loop.prototype.shrink = function() {
   return shrinkASTNode(hh.LOOP, this.children);
}

function shrinkInt(i) {
   if (i === 0) return [];
   if (i < 0) return [-i, i+1];
   return [i-1];
}

function shrinkArray(a) {
   let ans = [];
   for (let i=0;i < a.length; i++) {
      ans.push(a.slice(0,i).concat(a.slice(i + 1,a.length)));
   }
   for (let i=0; i < a.length; i++) {
      let shrunken_i = shrinker(a[i])
      for (let j=0; j<shrunken_i.length; j++) {
	 ans.push(a.map((v,k) => (i === k) ? shrunken_i[j] : v));
      }
   }
   return ans;
}

//console.error(shrinkArray([1]));
//console.error(shrinkArray([1,2,3]), [[2,3],[1,3],[1,2],[0,2,3],[1,1,3],[1,2,2]]);
