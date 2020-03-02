
/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/causality.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano & Jayanth Krishnamurthy            */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Tue Jul  9 14:11:39 2019 (serrano)                */
/*    Copyright   :  2020 Inria                                        */
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
function findCausalityErrorDeep( machine ) {
/* Method attributed to Francois Bourdoncle, who uses Tarjan algorithm
recurcively to build strongly connected sub components */
   function bourdoncleTarjan( v ) {

      let P = [];          // stack for pushing elements as and wheb visited.
      let partition = [];
      let num = 0;         // to track depth first search number (dfn)

      function subComponent(vertex){
         let partition = [];
         vertex.fanout_list.forEach( f => {
            let w = f.net;
            if( w.dfn === 0 ) {
               visit( w, partition );
            }
         } );
         partition.splice( 0,0,vertex );
         return partition;
      }

      function visit( v, partition) {
         P.push( v );
         num = num + 1;
         v.dfn = num;
         v.head = num;
         let loop = false;
         let min;
         let element;

	      v.fanout_list.forEach( f => {
            let w = f.net;
            if( w.dfn === 0 || w.dfn === undefined ) {
	            min =  visit( w, partition );
            } else {
               min = w.dfn;
            }
            if ( min <= v.head) {
               v.head = min;
               loop = true;
            }
	      } );

         if (v.head === v.dfn)  {
            v.dfn = +Infinity;
            element = P.pop();
            if(loop){
               while(element !== v) {
               element.dfn = 0;
               element = P.pop();
               }
               partition.splice( 0,0,subComponent(v) );
            } else {
               partition.push(v);
            }
         }
         return v.head;
      }
      visit(v,partition);
      delete v.dfn;
      delete v.head;
      return partition;
   } // end of bourdoncleTarjan
   // todo: to delete v.dfn which was assigned inside visit function.


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

   function shortestCycle( ex_dict, ex_info ) {
      let resultCycle = [];
      for( let key in ex_dict ) {
         if( resultCycle.indexOf( ex_info[ key ]) < 0 ) {
            resultCycle.push( ex_info[ key ] );
         }
      }
      // sort based on buffer position
      resultCycle.sort( (a, b) => { return a.pos - b.pos ; } );

      if( resultCycle.length > 1 ) {
   	   //console.error( `CausalityError: cycle of length ${resultCycle.length} detected` );
         //for( let i = 0; i < resultCycle.length; i++ ){
      	//   console.error(`   ${resultCycle[i].filename}:${resultCycle[i].pos}`);
         //}
	   //console.error( "" );
      return resultCycle;
      } else {
	      return false;
      }
   }
   function isSamePos(array){
      let tcc_loc = array.map( n => n.ast_node.loc );
      let posSame = true;
      let pos = tcc_loc[0].pos
      for(let i=0 ; i<tcc_loc.length ; i++){
         if(tcc_loc[i].pos !== pos ) {
            posSame =  false;
         }
      }
      return posSame;
   }

   function findDeepest(array){
      let temp=[];
      temp = array.find(element => element.length >1);
      if(Array.isArray(temp)){
           return findDeepest(temp);
      }
      return array;
   }

   function readMergeComponents(array){
      if((array.find(element => element.length >1)) === undefined){
         if(!isSamePos(array)){
            return array;
         } else {
            // all the nets in a subcompnent are formed at the same
            // position in source file. So, one of the nets is returned.
            return array[0];
         }
      } else {
         let temp = [];
         for(let i=0; i < array.length ; i++){
            if( !Array.isArray(array[i]) ){
               temp.push(array[i]);
            } else {
               let arrayTemp = readMergeComponents(array[i]);// recurcive call
               if (arrayTemp.length === undefined){
                  temp = temp.concat(arrayTemp);
               } else {
                  temp.push(arrayTemp);
               }
            }
         }
      return temp;
      }
   }

   let nets = machine.nets.filter( n => !n.isInKnownList );

   // depth first number initially asigned to zero for all the vertices
   nets.forEach( v => { v.dfn = 0} );

   // for each net we will try to build connected components list,
   // which will have strongly connected sub compnents, if any.
   for(let i=0 ; i<nets.length ; i++){
      let components = bourdoncleTarjan(nets[i]);
      let tempStack=[];
      if(components.length > 1){
      // reading through connected components to get the deepest subcomponent.
         for(let i=0; i < components.length ; i++) {
            if(!Array.isArray(components[i])){
               tempStack.push(components[i]);
            } else {
               let arrayTemp = readMergeComponents(components[i]);
               if (arrayTemp.length === undefined){
                  tempStack = tempStack.concat(arrayTemp);
               } else {
                  tempStack.push(arrayTemp);
               }
            }
         }
         //todo: what if tempStack is a new inner component with identical
         // position?
         let tarjanComponent = {};
         for( let j = 0 ; j < tempStack.length ; j++ ) {
            if( tempStack[ j ].length > 1 ) {
               let solComponent = findDeepest(tempStack[ j ]);
               let sigList = [];
               let tcc_loc = solComponent.map( n => n.ast_node.loc );
               let tcc_fanoutlist = solComponent.map( n => n.fanout_list );
               let tcc_faninlist = solComponent.map( n => n.fanin_list );
               let fanout_id = [];
               let fanin_id = [];
               let tccFinFout = {};
               let tccLocInfo = {};
               let tccFinFoutName={};

               // the following code is for  seeing participating fanins and fanouts
               // in a tarjan sub component.
               for( let i = 0; i < solComponent.length; i++ ) {
                  fanout_id = tcc_fanoutlist[ i ].map( n => n.net.debug_id );
                  fanin_id = tcc_faninlist[ i ].map( n => n.net.debug_id );
                  tccFinFout[ solComponent[ i ].debug_id ] = [fanin_id, fanout_id];
                  tccLocInfo[ solComponent[ i ].debug_id ] = tcc_loc[ i ];
                  tccFinFoutName[ solComponent[ i ].debug_name ] = [fanin_id, fanout_id];
               }

               // collect all the file names and respective positions tp store in
               // JSON format.
               let cycle = shortestCycle( tccFinFout , tccLocInfo );
               let tempFileList = [];
               for (let i in tccLocInfo){
                  if (tempFileList.indexOf( tccLocInfo[i].filename ) < 0 ){
                     tempFileList.push( tccLocInfo[ i ].filename );
                  }
               }
               let errorPosArray = [];
               for(let j = 0 ; j < tempFileList.length ; j++){
                  let errorPos = [];
                  for(let i in  tccLocInfo){
                     if( tccLocInfo[ i ].filename === tempFileList[ j ] ){
                        if ( errorPos.indexOf( tccLocInfo[ i ].pos ) < 0 ){
                           errorPos.push( tccLocInfo[ i ].pos );
                        }
                     }
                  }
                  errorPosArray.push( errorPos );
               }

               for(let i = 0; i < errorPosArray.length; i++){
                  errorPosArray[ i ].sort( (a, b) => { return a - b ; } );
               }

               let positionEntryFlag = false; //flag for not saving those components having only one position ?
               let tccCyclearray = []; // array of file names and positions
               for(let i = 0 ; i < tempFileList.length ; i++){
                  let tccCycle = {}; //filenames and corresponding positions
                  if( errorPosArray[ i ].length > 1 ){
                     positionEntryFlag = true; //more than one position, hence flag set and info collected
                     tccCycle.filename = tempFileList[ i ];
                     tccCycle.locations = errorPosArray[ i ];
                     tccCyclearray.push( tccCycle );
                  }
               }

               if( positionEntryFlag ){
                  tarjanComponent[j] = tccCyclearray;
               }
               /*console.log("Connected Component")
               for(let i in tccFinFoutName){
                  console.log(`${i}:
                           fanin : [${tccFinFoutName[i][0]}],
                           fanout: [${tccFinFoutName[i][1]}]`);
               }*/
               // finding participating signals in cycle.
               // is this correct way?
               let tempSignal = findCycleSignals( solComponent[0] );
               //console.log(`Participating Signals :  ${tempSignal}`);

               if( cycle ) {
                  let  myresult = Object.keys( tarjanComponent ).map( function( key ) {
                     return tarjanComponent[ key ];
                  });
                  let myJSON = JSON.stringify(myresult);
                  if(#:bigloo-debug() > 0 ){
                     fs.writeFileSync(hh.CAUSALITY_JSON, myJSON);
                  }
                  console.log(myJSON);
                  return{
                        loc: myJSON,
                        size: cycle.length,
                        signals: tempSignal
                  }
               }
            }
         }
      }
   }
   return {
               loc: false,
               size: -1,
               signals: []
      }

}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.findCausalityErrorDeep = findCausalityErrorDeep;
