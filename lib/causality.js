/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/causality.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano & Jayanth Krishnamurthy            */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Mon Feb 10 09:45:59 2025 (serrano)                */
/*    Copyright   :  2019-25 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop causality error handling                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as config from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";

export { findCausalityError, findCausalityErrorDefault };

/*---------------------------------------------------------------------*/
/*    findCausalityError ...                                           */
/*---------------------------------------------------------------------*/
function findCausalityError(mach) {
   if (mach.causalityErrorTrace === "shallow") {
      return findCausalityErrorShallow(mach);
   } else if (mach.causalityErrorTrace === "deep") {
      return findCausalityErrorDeep(mach);
   } else {
      return findCausalityErrorDefault(mach);
   }
}

       
/*---------------------------------------------------------------------*/
/*    findCausalityErrorDefault ...                                    */
/*---------------------------------------------------------------------*/
function findCausalityErrorDefault(machine) {

   function min(a, b) {
      return a < b ? a : b;
   }
   
   function isCyclic(src) {
      let stack = [];
      
      function loop(net) {
	 if (net === src) {
	    return true;
	 } else if (stack.indexOf(net) >= 0) {
	    return false;
	 } else {
	    stack.push(net);
	    return net.faninList.find(f => loop(f.net));
	 }
      }

      return src.faninList.find(f => loop(f.net));
   }

   function findCycleSignals(src) {
      let stack = [];
      let res = [];
      
      function loop(net) {
	 if (stack.indexOf(net) < 0) {
	    if (net.accessor_list) {
	       net.accessor_list.forEach(a => {
		  if (res.indexOf(a.signame) < 0) {
		     res.push(a.signame);
		  }
	       });
	    }
	    stack.push(net);
	    net.faninList.forEach(f => loop(f.net));
	 }
      }

      loop(src);
      return res;
   }    

   function findCycleSources() {
      let nets = machine.nets.filter(n => !n.isInKnownList);
      const cycles = {};
      nets.forEach(nets => {
	 const { filename, pos } = nets.astNode.loc;
	 if (typeof pos === "number") {
	    if (filename in cycles) {
	       cycles[filename].push(pos);
	    } else {
	       cycles[filename] = [pos];
	    }
	 }
      });

      return Object.keys(cycles).map(k => [{ filename: k, locations: cycles[k] }]);
   }
   
   function cycleSize(src) {
      let stack = [];
      let res = 0;
      
      function loop(net) {
	 if (stack.indexOf(net) < 0) {
	    res++;
	    stack.push(net);
	    net.faninList.forEach(f => loop(f.net));
	 }
      }

      loop(src);
      return res;
   }    
      
   let nets = machine.nets.filter(n => !n.isInKnownList);
   let head = nets.find(isCyclic);

   if (head) {
      const cycles = findCycleSources();
      return {
	 loc: head.astNode.loc,
	 size: cycleSize(head),
	 signals: findCycleSignals(head),
	 json: JSON.stringify(cycles),
	 posFlag: undefined,
	 cycles: cycles
      };
   } else {
      return {
	 loc: false,
	 size: -1,
	 signals: [],
	 json: null,
	 posFlag: undefined,
	 cycles: null
      };
   }
}

/*---------------------------------------------------------------------*/
/*    findCausalityErrorShallow ...                                    */
/*---------------------------------------------------------------------*/
function findCausalityErrorShallow(machine) {

   function min(a, b) {
      return a < b ? a : b;
   }
   
   function tarjan(net) {
      // https://fr.wikipedia.org/wiki/Algorithme_de_Tarjan
      let num = 0;
      let P = [];
      let partition = [];
      
      function walk(v) {
	 if (v.LogicalNetType !== "REG") {
	    v.num = num;
	    v.numReachable = num;
	    num++;
	    P.push(v);
	    v.inP = true;
	    
	    v.fanoutList.forEach(f => {
		  const w = f.net;
		  if (w.num === undefined) {
		     walk(w);
		     v.numReachable = min(v.numReachable, w.numReachable);
		  } else if (w.inP) {
		     v.numReachable = min(v.numReachable, w.num);
		  }
	       });
	    
	    if (v.numReachable === v.num) {
	       let C = [];
	       let w;
	       
	       do{
		  w = P.pop();
		  w.inP = false;
		  C.push(w);
	       } while(w !== v);
		      
               partition.push(C);
	    }
	 }
      }
      
      net.forEach(v => { if (!v.num) walk(v); });
      
      net.forEach(n => {
	    delete n.inP;
	    delete n.num;
	 });
      return partition;
   }
   
   function isCyclic(src) {
      let stack = [];
      function loop(net) {
	 if (net === src) {
	    return true;
	 } else if (stack.indexOf(net) >= 0) {
	    return false;
	 } else {
	    stack.push(net);
	    return net.faninList.find(f => loop(f.net));
	 }
      }
      return src.faninList.find(f => loop(f.net));
   }
   
   function findCycleSignals(src) {
      let stack = [];
      let res = [];
      
      function loop(net) {
	 if (stack.indexOf(net) < 0) {
	    if (net.accessor_list) {
	       net.accessor_list.forEach(a => {
		     if (res.indexOf(a.signame) < 0) {
			res.push(a.signame);
		     }
		  });
	    }
	    stack.push(net);
	    net.faninList.forEach(f => loop(f.net));
	 }
      }
      
      loop(src);
      return res;
   }
   
   function cycleSize(src) {
      let stack = [];
      let res = 0;
      
      function loop(net) {
	 if (stack.indexOf(net) < 0) {
	    res++;
	    stack.push(net);
	    net.faninList.forEach(f => loop(f.net));
	 }
      }
      
      loop(src);
      return res;
   }
   
   function shortestCycle(ex_dict, ex_info) {
      let resultCycle = [];
      
      for (let key in ex_dict) {
	 if (resultCycle.indexOf(ex_info[ key ]) < 0) {
	    resultCycle.push(ex_info[ key ]);
	 }
      }
      
      // sort based on buffer position
      resultCycle.sort((a, b) => { return a.pos - b.pos ; });
      if (resultCycle.length > 1) {
	 console.error(`CausalityError: cycle of length ${resultCycle.length} detected`);
	 for (let i = 0; i < resultCycle.length; i++) {
	    console.error(`   ${resultCycle[i].filename}:${resultCycle[i].pos}`);
	 }
	 console.error("");
	 return resultCycle;
      } else {
	 return false;
      }
   }

   function addunique(list, item){
	if (list.indexOf(item) < 0) {
	    list.push(item);
	 }
   }
   
   let nets = machine.nets.filter(n => !n.isInKnownList);
   let components = tarjan(nets);
   let rloc = false;
   let rsize = -1;
   let tarjanComponent = {};
   // error messages
   for (let j = 0; j < components.length; j++) {
      if (components[ j ].length > 1) {		
	 let component = components[ j ];
	 let tcc_loc = component.map(n => n.astNode.loc);
	 let tcc_fanoutlist = component.map(n => n.fanoutList);
	 let tcc_faninlist = component.map(n => n.faninList);
	 let fanout_id = [];
	 let fanin_id = [];
	 let tccFinFout = {};
	 let tccLocInfo = {};
	 // for printing participating fanins and fanouts in tarjan component
	 let tccFinFoutName={};
	 let FileCausal=[];
	 tcc_loc.forEach(n => {
		if (FileCausal.indexOf(n) < 0) {
			FileCausal.push(n);
		}
	 });
	 let myobj={}
	 FileCausal.forEach(v => {
	     myobj[v.filename]=[];
	 });
	 FileCausal.forEach(v => {
	     if (myobj[v.filename].indexOf(v.pos) < 0) {
		 myobj[v.filename].push(v.pos);
	     }
	     myobj[v.filename].sort()
	 });
	 let locCount=0
	 for (let i in myobj) {
	     locCount+=myobj[i].length;
	 }
	 if( locCount === 1 ){
		 continue;
	 }
	 /*
	 for (let i = 0; i < component.length; i++) {
	    fanout_id = tcc_fanoutlist[ i ].map(n => n.net.id);
	    fanin_id = tcc_faninlist[ i ].map(n => n.net.id);
	    tccFinFout[ component[ i ].id ] = [ fanin_id, fanout_id ];
	    tccLocInfo[ component[ i ].id ] = tcc_loc[ i ];
	    tccFinFoutName[ component[ i ].debug_name ] = [ fanin_id, fanout_id ];
	 }
	 */
	 
	 let cycle = shortestCycle( tccFinFout , tccLocInfo );
	 //let cycle = false;
	 let tempFileList = [];
	 for (let i in tccLocInfo) {
	    if (tempFileList.indexOf(tccLocInfo[i].filename) < 0) {
	       tempFileList.push(tccLocInfo[ i ].filename);
	    }
	 }
	 
	 let errorPosArray = [];
	 for (let j = 0 ; j < tempFileList.length ; j++) {
	    let errorPos = [];
	    for (let i in  tccLocInfo) {
	       if (tccLocInfo[ i ].filename === tempFileList[ j ]) {
		  if (errorPos.indexOf(tccLocInfo[ i ].pos) < 0) {
		     errorPos.push(tccLocInfo[ i ].pos);
		  }
	       }
	    }
	    errorPosArray.push(errorPos);
	 }
	 for (let i = 0; i < errorPosArray.length; i++) {
	    errorPosArray[ i ].sort((a, b) => { return a - b ; });
	 }
	 
	 // flag for not saving those components having only one position ?
	 let positionEntryFlag = false; 
	 // array of file names and positions
	 let tccCyclearray = []; 

	 for (let i = 0 ; i < tempFileList.length ; i++) {
	    // filenames and corresponding positions
	    let tccCycle = {}; 
	    if (errorPosArray[ i ].length > 1) {
	       // more than one position, hence flag set and info collected
	       positionEntryFlag = true; 
	       tccCycle.filename = tempFileList[ i ];
	       tccCycle.locations = errorPosArray[ i ];
	       tccCyclearray.push(tccCycle);
	    }
	 }

	 if (positionEntryFlag) {
	    tarjanComponent[ j ] = tccCyclearray;
	 }
     	 //console.log(tccCyclearray);
	 
	 let tempSignal = findCycleSignals(component[ 0 ]);
	 if (locCount) {
/* 	    if (hop.config.debug > 0 && hop.isServer) {                */
/* 	       let myresult = Object.keys(myobj)                       */
/* 		  .map(key => tarjanComponent[ key ]);                 */
/* 	       let myJSON = JSON.stringify(myobj);                     */
/* 	       import("fs").then(fs => {                               */
/* 	       	     fs.writeFileSync(config.CAUSALITY_JSON, myJSON);  */
/* 		  });                                                  */
/* 	    }                                                          */
	    
	    return {
	       loc: myobj,
	       size: locCount,
	       signals: tempSignal,
	       json: JSON.stringify(myobj),
	       posFlag: undefined,
	       result: undefined
	    }
	 }	    
      }	
   }
   
   return {
      loc: false,
      size: -1,
      signals: [],
      json: null,
      posFlag: undefined,
      result: undefined
   }
}

/*---------------------------------------------------------------------*/
/*    findCausalityErrorDeep ...                                       */
/*    -------------------------------------------------------------    */
/*    Method attributed to Francois Bourdoncle, who uses Tarjan        */
/*    algorithm recursively to build strongly connected sub            */
/*    components. The method will return subcompnents if any for a     */
/*    net in list format of all the connected nets for e.g for net     */
/*    1 the following list [1,2,3,[4,5,[10,11,12],6],7,8,9] is         */
/*    returned. From this the deepest [10,11,12] should be read and    */
/*    their repective positions will be displayed.                     */
/*    For cauality analysis debugging support, CausalityErrorTrace     */
/*    option should be set to "shallow" (for bigger cycle) or "deep"   */
/*    for (smallest cycle).  Default value set to "deep"               */
/*    e.g:                                                             */
/*    const machine =                                                  */
/*       new hh.ReactiveMachine(examplemodulename,                     */
/*          {CausalityErrorTrace:"shallow"});                          */
/*---------------------------------------------------------------------*/
function findCausalityErrorDeep(machine, compilePhase = false) {
   
    function bourdoncleTarjan(v) {
	let P = [];
	let partition = [];
	let num = 0;
	
	function subComponent(vertex) {
	   let part = [];
	   let fanOut = vertex.fanoutList;
	   
	   for (let i=0; i < fanOut.length ; i++){
	      let w = fanOut[ i ].net;
	      if (w.LogicalNetType() !== "REG") {
		 if (w.dfn === 0) {
		    visit(w, part);
		 }
	      }
	      
	   }
	   part.push(vertex);
	   return part;
	}
	
	function visit(v, partition) {
	   if (v.LogicalNetType !== "REG") {
	      P.push(v);
	      num = num + 1;
	      v.dfn = num;
	      v.head = num;
	      let loop = false;
	      let min;
	      let element;
	      let fanOut = v.fanoutList;
	      
	      for (let i = 0; i < fanOut.length; i++) {
		 let w = fanOut[ i ].net;
		 if (w.LogicalNetType() !== "REG") {
		    if (w.dfn === 0 || w.dfn === undefined){
		       min = visit(w, partition);
		    } else {
		       min = w.dfn;
		    }
		    if (min <= v.head) {
		       v.head = min;
		       loop = true;
		    }
		 }
	      }
	      
	      if (v.head === v.dfn)  {
		 v.dfn = +Infinity;
		 element = P.pop();
		 if (loop) {
		    while (element !== v) {
		       element.dfn = 0;
		       element = P.pop();
		    }
		    //partition.splice(0,0,subComponent(v));
		    partition.push(subComponent(v));
		 } else {
		    partition.push(v);
		 }
	      }
	      return v.head;
	   }
	   return ;
	}
	
	visit(v, partition);
	return partition;
    }
    
    function findCycleSignals(src) {
       let res = [];
       for (let i=0; i < src.length; i++) {
	  if (src[i].accessor_list) {
	     src[i].accessor_list.forEach(a => {
		   if (res.indexOf(a.signame) < 0) {
		      res.push(a.signame);
		   }
		});
	  }
       }
       return res;
    }
    
    function findCycleLength(ex_info) {
       let resultCycle = [];
       let PosFlag = true;
       for (let key in ex_info) {
	  let tempInfo = ex_info[ key ];
	  if (tempInfo.pos !== undefined) {
	     if (resultCycle.indexOf(tempInfo) < 0) {
		resultCycle.push(tempInfo);
	     }
	  } else {
	     resultCycle.push(key);
	     PosFlag = false;
	  }   
       }
       if (PosFlag){
	  resultCycle.sort((a, b) => { return a.pos - b.pos ; });
       }
       return {
	  cycle: resultCycle,
	  posFlag: PosFlag
       }
    }
    
    function findDeepestComp(array){
       let temp=[];
       temp = array.find(element => element.length > 1);
       if (Array.isArray(temp)) {
	  return findDeepestComp(temp);
       }
       return array;
    }
    
    function cleanNets(){
       machine.nets.forEach(v=> {
         v.dfn = undefined;
	 v.head = undefined;
      });
    }
    let nets = machine.nets.filter(n => !n.isInKnownList);
    nets.forEach(v => { v.dfn = 0; });
    let tmpnetList = [];
    let compCount = 0;
    
    for (let i=0 ; i<nets.length ; i++) {
       if (nets[ i ].dfn === 0) {
	  let components = bourdoncleTarjan(nets[ i ]);
	  
	  if (compilePhase) {
	     let tmpComp = findDeepestComp(components);
	     if (tmpComp.length === components.length) {
		tmpnetList.push(components);
		compCount += components.length;
		if (compCount === nets.length) {
		   cleanNets();// remove nets.dfn and nets.head
		   return {
		      loc: false,
		      size: 0,
		      signals: [],
		      posFlag: true
		   }
		}
	     }
	  }
	  
	  if (Array.isArray(components)) {
	     let tempStack = components;
	     let tarjanComponent = {};
	     
	     for (let j = 0 ; j < tempStack.length ; j++) {
		if (Array.isArray(tempStack[ j ])) {
		   let solComponent = findDeepestComp(tempStack[ j ]);
		   let tcc_loc = solComponent.map(n => n.astNode.loc);
		   let tccLocInfo = {};
		   
		   for (let i = 0; i < solComponent.length; i++) {
		      tccLocInfo[ solComponent[ i ].id ] = tcc_loc[ i ];
		   }
		   
		   let { cycle, posFlag }= findCycleLength(tccLocInfo);
		   cycle.len = cycle.length;
		   let tempFileList = [];
		   let cycleLength = 0;
		   
		   if (posFlag) {
		      let errorPosArray = [];
		      
		      for (let i in tccLocInfo) {
			 if (tempFileList.indexOf(tccLocInfo[ i ].filename) < 0) {
			    tempFileList.push(tccLocInfo[ i ].filename);
			 }
		      }
		      
		      for (let j = 0 ; j < tempFileList.length; j++) {
			 let errorPos = [];
			 
			 for (let i in  tccLocInfo) {
			    if (tccLocInfo[ i ].filename === tempFileList[ j ]){
			       if (errorPos.indexOf(tccLocInfo[ i ].pos) < 0){
				  errorPos.push(tccLocInfo[ i ].pos);
			       }
			    }
			 }
			 errorPosArray.push(errorPos);
			 cycleLength+=errorPos.length;
		      }
		      
		      for (let i = 0; i < errorPosArray.length; i++) {
			 errorPosArray[ i ].sort((a, b) => { return a - b ; });
		      }
		      
		      // flag for not saving those components having 
		      // only one position?
		      let positionEntryFlag = false; 
		      // array of file names and positions
		      let tccCyclearray = []; 
		      
		      for (let i = 0 ; i < tempFileList.length ; i++) {
			 // filenames and corresponding positions
			 let tccCycle = {}; 
			 
			 if (errorPosArray[ i ].length >= 1) {
			    // more than one position, hence flag 
			    // set and info collected
			    positionEntryFlag = true; 
			    tccCycle.filename = tempFileList[ i ];
			    tccCycle.locations = errorPosArray[ i ];
			    tccCyclearray.push(tccCycle);
			 }
		      }
		      if (positionEntryFlag){
			 tarjanComponent[j] = tccCyclearray;
		      }
		      cycle.len = cycleLength;
		   }

		   let tempSignal = findCycleSignals(solComponent);
		   if (cycle) {
		      const finalResult = Object.keys(tarjanComponent)
			 .map(key => tarjanComponent[key]);
		      
		      // remove nets.dfn and nets.head
		      cleanNets();
		      
		      return {
			 loc: false,
			 size: cycle.len,
			 signals: tempSignal,
			 json: JSON.stringify(finalResult),
			 posFlag: posFlag,
			 cycles: finalResult
		      }
		   }
		}
	     }
	  }
       }
    }
    
    // remove nets.dfn and nets.head
    cleanNets();
    
    return {
        loc: false,
        size: -1,
        signals: [],
	json: null,
	posFlag: undefined,
	cycles: null,
    }
}
