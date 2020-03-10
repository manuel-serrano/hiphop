
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
         let fanOut = vertex.fanout_list;
         for(let i=0; i < fanOut.length ; i++){
            let w = fanOut[i].net;
            if(w.LogicalNetType() !== "REG"){
               if( w.dfn === 0 ) {
               //   console.log("comp ",w.debug_id)
                  visit( w, partition );
               }
            }

         }
         partition.push( vertex );
         return partition;
      }

      function visit( v, partition) {
         if(v.LogicalNetType !== "REG"){
            P.push( v );
            num = num + 1;
            v.dfn = num;
            v.head = num;
            let loop = false;
            let min;
            let element;
            let fanOut = v.fanout_list;
            for(let i = 0; i < fanOut.length; i++ ){
               let w = fanOut[i].net;
               if(w.LogicalNetType() !== "REG" ){         
                  if( w.dfn === 0 || w.dfn === undefined){
                     min = visit(w, partition);
                  } else {
                     min = w.dfn;
                  }
                  if ( min <= v.head) {
                     v.head = min;
                     loop = true;
                  }
               }
            }

            if (v.head === v.dfn)  {
               v.dfn = +Infinity;
               element = P.pop();
               if(loop){
                  while(element !== v) {
                  element.dfn = 0;
                  element = P.pop();
                  }
                  //partition.splice( 0,0,subComponent(v) );
                  partition.push( subComponent(v) );
               } else {
                  partition.push(v);
               }
            }
            return v.head;
         }
         return ;
      }
      
      visit(v,partition);
      delete v.dfn;
      delete v.head;
      
      return partition;
   } // end of bourdoncleTarjan
   // todo: to delete v.dfn which was assigned inside visit function.

  
   function findCycleSignals( src ) {
      let res = [];
      for (let i=0; i < src.length; i++){
         if( src[i].accessor_list ) {
            src[i].accessor_list.forEach( a => {
               if( res.indexOf( a.signame ) < 0 ) {
                  res.push( a.signame );
               }
            } );
         }
      }    
      return res;
   }
   
   function findCycleLength( ex_dict, ex_info ) {
      let resultCycle = [];
      for( let key in ex_dict ) {
         if( resultCycle.indexOf( ex_info[ key ]) < 0 ) {
            resultCycle.push( ex_info[ key ] );
         }
      }
      resultCycle.sort( (a, b) => { return a.pos - b.pos ; } );
      if( resultCycle.length > 1 ) {
      return resultCycle;
      } else {
	      return false;
      }
   }

   function findDeepestComp(array){
      let temp=[];
      temp = array.find(element => element.length >1);
      if(Array.isArray(temp)){
           return findDeepestComp(temp);
      }
      return array;
   }
   
   let nets = machine.nets.filter( n => !n.isInKnownList );
   nets.forEach( v => { v.dfn = 0; } );
   // for each net we will try to build connected components list,
   // which will have strongly connected sub compnents, if any.
   for(let i=0 ; i<nets.length ; i++){
      let components = bourdoncleTarjan(nets[i]);
      if(Array.isArray(components)){
         let tempStack = components;
         let tarjanComponent = {};
         for( let j = 0 ; j < tempStack.length ; j++ ) {
            if( Array.isArray(tempStack[ j ])) {
               let solComponent = findDeepestComp(tempStack[j]);
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
               let cycle = findCycleLength( tccFinFout , tccLocInfo );
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
               /*
               console.log("Connected Component")
               for(let i in tccFinFoutName){
                  console.log(`${i}:
                  fanin : [${tccFinFoutName[i][0]}],
                  fanout: [${tccFinFoutName[i][1]}]`);
               }
               */

               let tempSignal = findCycleSignals( solComponent );
               if( cycle ) {
                  let  myresult = Object.keys( tarjanComponent ).map( function( key ) {
                     return tarjanComponent[ key ];
                  });
                  let myJSON = JSON.stringify(myresult);
                  if(#:bigloo-debug() > 0 ){
                     fs.writeFileSync(hh.CAUSALITY_JSON, myJSON);
                  }
                  // console.error(myJSON); // enable to display locations, may interrupt tests.
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
