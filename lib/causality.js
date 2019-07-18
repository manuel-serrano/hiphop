/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/causality.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano & Jayanth Krishnamurthy            */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Tue Jul  9 14:11:39 2019 (serrano)                */
/*    Copyright   :  2019 Inria                                        */
/*    -------------------------------------------------------------    */
/*    HipHop causality error messages                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const error = require( "./error.js" );
const fs = require("fs");

 const hh = require("./hiphop.js");

/*---------------------------------------------------------------------*/
/*    findCausalityError ...                                           */
/*---------------------------------------------------------------------*/
function findCausalityError( machine ) {

   function min( a, b ) {
      return a < b ? a : b;
   }

   function tarjan( net ) {
      // https://fr.wikipedia.org/wiki/Algorithme_de_Tarjan
      let num = 0;
      let P = [];
      let partition = [];

      function walk( v ) {
	 v.num = num;
	 v.numReachable = num;
	 num++;
	 P.push( v );
	 v.inP = true;

	 v.fanout_list.forEach( f => {
	       const w = f.net;

	       if( w.num === undefined ) {
	       	  walk( w );
	       	  v.numReachable = min( v.numReachable, w.numReachable );
	       } else if( w.inP ) {
	       	  v.numReachable = min( v.numReachable, w.num );
	       }
	    } );

	 if( v.numReachable === v.num ) {
	    let C = [];
	    let w;

	    do {
	       w = P.pop();
	       w.inP = false;
	       C.push( w );
	    } while( w !== v );

	    	   partition.push( C );
	 }
      }

      net.forEach( v => { if( !v.num ) walk( v ); } );

      net.forEach( n => {
	    delete n.inP;
	    delete n.num;
      	 } );

      return partition;
   }

   function isCyclic( src ) {
      let stack = [];

      function loop( net ) {
	 if( net === src ) {
	    return true;
	 } else if( stack.indexOf( net ) >= 0 ) {
	    return false;
	 } else {
	    stack.push( net );
	    return net.fanin_list.find( f => loop( f.net ) );
	 }
      }

      return src.fanin_list.find( f => loop( f.net ) );
   }

   function findCycleSignals( src ) {
      let stack = [];
      let res = [];

      function loop( net ) {
	 if( stack.indexOf( net ) < 0 ) {
	    if( net.accessor_list ) {
	       net.accessor_list.forEach( a => {
		     if( res.indexOf( a.signame ) < 0 ) {
		     	res.push( a.signame );
		     }
	       	  } );
	    }
	    stack.push( net );
	    net.fanin_list.forEach( f => loop( f.net ) );
	 }
      }

      loop( src );
      return res;
   }

   function cycleSize( src ) {
      let stack = [];
      let res = 0;

      function loop( net ) {
	 if( stack.indexOf( net ) < 0 ) {
	    res++;
	    stack.push( net );
	    net.fanin_list.forEach( f => loop( f.net ) );
	 }
      }

      loop( src );
      return res;
   }

   function findCycle( ex_dict, my_key ) {
      let bfsKey_q = [];
      let count = 1;
      let item = ex_dict[ my_key ];
      let myresult = Object.keys( item ).map( function( key ) {
	 return item[ key ];
      });

      for( let i = 0; i < myresult.length; i++ ) {
	 bfsKey_q.push( myresult[ i ] );
      }
      while( true ) {
	 let found = bfsKey_q.findIndex( function( element ) {
	    // element type is number
	    // return element === Number( my_key );
	    return element === my_key;
	 });

	 if( found > -1 ){
	    return count;
	 }
	 count++;
	 let qLength = bfsKey_q.length;
	 for( let i = 0; i < qLength; i++ ){
	    let new_v = bfsKey_q[ i ];
	    item = ex_dict[ new_v ];
	    if( item === undefined ){
	       continue;
	    }
	    myresult = Object.keys( item ).map( function( key ) {
	       return item[ key ];
	    });
            for( let i = 0; i < myresult.length; i++ ) {
	       bfsKey_q.push( myresult[ i ] );
	    }
	 }
	 for( let i = 0; i < qLength; i++  ){
	    bfsKey_q.shift();
	 }
      }
   }

   function shortestCycle( ex_dict, ex_info ) {
      let resultCycle = [];

      for( let key in ex_dict ) {
         // let shortestCycleLength = findCycle( ex_dict , parseInt( key ) );

         if( resultCycle.indexOf( ex_info[ key ]) < 0 ) {
	    resultCycle.push( ex_info[ key ] );
         }
      }

      // sort based on buffer position
      resultCycle.sort( (a, b) => { return a.pos - b.pos ; } );

      if( resultCycle.length > 1 ) {
	 console.error( `CausalityError: cycle of length ${resultCycle.length} detected` );
      	 for( let i = 0; i < resultCycle.length; i++ ){
      	    console.error(`   ${resultCycle[i].filename}:${resultCycle[i].pos}`);
         }
	 console.error( "" );
      	 return resultCycle;
      } else {
	 return false;
      }
   }

   let nets = machine.nets.filter( n => !n.isInKnownList );
   let components = tarjan( nets );
   let rloc = false;
   let rsize = -1;
   let tarjanComponent={};
   // error messages
   for( let j = 0; j < components.length; j++ ) {
      if( components[ j ].length > 1 ) {
 	 // more than one nets should be in a compnent?
	 // no single element loops??
	 let component = components[ j ];
  //  console.log(component);
	 // get the debug ids of all participating nets in a
	 // strongly connected compnent
    	 let tcc_loc = components[ j ].map( n => n.ast_node.loc );
	 // respective positions

    	 let tcc_fanoutlist = components[ j ].map( n => n.fanout_list );
	 // fanout list of each of the nets
       let tcc_faninlist = components[ j ].map( n => n.fanin_list );

    	 let fanout_id = [];
       let fanin_id = [];
    	 let tcc_dict = {};
    	 let tcc_info = {};
       let tcc_mydict={};

    	 for( let i = 0; i < component.length; i++ ) {
            fanout_id = tcc_fanoutlist[ i ].map( n => n.net.debug_id );
            fanin_id = tcc_faninlist[ i ].map( n => n.net.debug_id );
            tcc_dict[ component[ i ].debug_id ] = [fanin_id, fanout_id];
            tcc_info[ component[ i ].debug_id ] = tcc_loc[ i ];
            tcc_mydict[ component[ i ].debug_name ] = [fanin_id, fanout_id];


    	 }

    	 let cycle = shortestCycle( tcc_dict , tcc_info );


       let tccFileName=[];
       let tccFilePosition=[];
       let tempfilelist=[];
       for (let i in tcc_info){

            if (tempfilelist.indexOf(tcc_info[i].filename) < 0){
             tempfilelist.push(tcc_info[i].filename);
           }
         }

      let errorPos=[];
      for(let j = 0 ; j < tempfilelist.length ; j++){
             let error = [];
             for(let i in  tcc_info){

               if(tcc_info[i].filename === tempfilelist[j]){
                 if (error.indexOf(tcc_info[i].pos) < 0){
                  error.push(tcc_info[i].pos);
                }

               }

               }

             errorPos.push(error);
             }

    //  console.log(errorPos);

      for(let j = 0; j < errorPos.length;j++){
        errorPos[j].sort( (a, b) => { return a - b ; } );
      }


    //  console.log(errorPos[0].length);

      let tccCycle = {};

      for(let i = 0 ; i < tempfilelist.length ; i++){
      //    console.log(`In file ${tempfilelist[i]} errors at position:`)
          tccCycle["filename"] = tempfilelist[i];
          //for(let j = 0; j < errorPos[i].length;j++){

              tccCycle["locations"] = errorPos[i];

          //  }

          }


  //    console.log(tccCycle);

      tarjanComponent[j] = [tccCycle];







       console.log();
       console.log("Connected component: ",j);
       console.log();
       for(let i in tcc_mydict){
         console.log(`${i}:
     fanin : [${tcc_mydict[i][0]}],
     fanout: [${tcc_mydict[i][1]}]`);
           console.log();
       }

       console.log();
       console.log();
// console.log(tarjanComponent);
let  myresult = Object.keys( tarjanComponent ).map( function( key ) {
    return tarjanComponent[ key ];
 });

console.log(myresult);
let myJSON = JSON.stringify(myresult);





//  let  dictString = JSON.stringify(tarjanComponent);
  // console.log(dictString);
   console.log();
  fs.writeFileSync(hh.CAUSALITY_JSON, myJSON);


	 if( cycle ) {
	    return {
	       loc: cycle[ 0 ],
	       size: cycle.length,
	       signals: []
	    }
	 }
      }
   }



   return {
      loc: false,
      size: -1,
      signals: []
   }
/*    let head = nets.find( n => isCyclic( n ) );                      */
/*                                                                     */
/*    if( head ) {                                                     */
/*       return {                                                      */
/* 	 loc: head.ast_node.loc,                                       */
/* 	 size: cycleSize( head ),                                      */
/* 	 signals: findCycleSignals( head ) }                           */
/*    } else {                                                         */
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.findCausalityError = findCausalityError;
