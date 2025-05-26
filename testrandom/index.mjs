import * as hh from "@hop/hiphop";
import { prop } from "./prop.mjs";
import { gen } from "./gen.mjs";
import { shrinker } from "./shrink.mjs";

const prg = hh.MODULE(
   {},
   hh.LOCAL(
      {},
      hh.SIGNAL(
	 { 'name': 'V_S_C' }),
      hh.SIGNAL(
	 { 'name': 'V_S_i' }),
      hh.IF(
	 {
	    'apply': function() {
	       return ((() => {
		  const V_S_C = this.V_S_C;
		  return V_S_C.now;
	       })());
	    }
	 }, hh.SIGACCESS(
	    {
	       'signame': 'V_S_C',
	       'pre': false,
	       'val': false,
	       'cnt': false
	    }),
	 hh.NOTHING(
	    {})),
      hh.IF(
	 {
	    'apply': function() {
	       return ((() => {
		  const V_S_i = this.V_S_i;
		  return V_S_i.now;
	       })());
	    }
	 }, hh.SIGACCESS(
	    {
	       'signame': 'V_S_i',
	       'pre': false,
	       'val': false,
	       'cnt': false
	    }), hh.EMIT(
	       { 'signame': 'V_S_C' })),
      hh.ATOM({
	 'apply': function() {
	    console.log('ok');
	 }
      })));

function shrink(prog) {
   const progs = shrinker(prog);

   if (progs.length === 0) {
      return prog;
   } else {
      for (let i = 0; i < progs.length; i++) {
	 if (prop(progs[i])) {
	    // we still have an error
	    return shrink(progs[i]);
	 }
      }
      return prog;
   }
}

function findBug() {
   for (let i = 0; i < 10; i++) {
      const prog = gen();
      //console.log(JSON.stringify(prog.dump()));
      console.log("###", i);
      const res = prop(prog);
      if (res) {
	 // an error occured
	 //console.error(res);
	 const shrunk = shrink(prog);
	 console.log(prop(shrunk));
	 process.exit(0);
      } else {
	 ;
      }
   }
}

findBug();
