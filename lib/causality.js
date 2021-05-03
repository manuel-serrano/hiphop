/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/causality.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano & Jayanth Krishnamurthy            */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Thu Apr 15 08:11:57 2021 (serrano)                */
/*    Copyright   :  2019-21 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop causality error messages                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const error = require( "./error.js" );
const cfg = require( hop.config );
const hh = require( "./hiphop.js" );
let fs = false;
       
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
	 if( v.LogicalNetType !== "REG" ) {
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
	       
	       do{
		  w = P.pop();
		  w.inP = false;
		  C.push( w );
	       } while( w !== v );
		      
               partition.push( C );
	    }
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
		  });
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
	 console.error( `CausalityError: cycle of length ${resultCycle.length} detected` );
	 for( let i = 0; i < resultCycle.length; i++ ) {
	    console.error( `   ${resultCycle[i].filename}:${resultCycle[i].pos}` );
	 }
	 console.error( "" );
	 return resultCycle;
      } else {
	 return false;
      }
   }

   function addunique(list, item){
	if( list.indexOf(item) < 0 ) {
	    list.push( item );
	 }
   }
   
   let nets = machine.nets.filter( n => !n.isInKnownList );
   let components = tarjan( nets );
   let rloc = false;
   let rsize = -1;
   let tarjanComponent = {};
   
   

   // error messages
   for( let j = 0; j < components.length; j++ ) {
      if( components[ j ].length > 1 ) {
		
			
	 let component = components[ j ];
	 console.log(component.length);
	
	 component.forEach(v=>{
		// console.log(v.debug_name);
	 });
	 
	 let sigList = [];

	 let tcc_loc = component.map( n => n.ast_node.loc );
	 let tcc_fanoutlist = component.map( n => n.fanout_list );
	 let tcc_faninlist = component.map( n => n.fanin_list );
	 let fanout_id = [];
	 let fanin_id = [];
	 let tccFinFout = {};
	 let tccLocInfo = {};
	 // for printing participating fanins and fanouts in tarjan component
	 let tccFinFoutName={};
	 //console.log(tcc_loc);
	 
     let FileCausal=[];
	 tcc_loc.forEach(n => {
		if( FileCausal.indexOf(n) < 0 ) {
			FileCausal.push( n );
		}
	 });
	 
	 console.log(FileCausal.length);
     
	 let myobj={}
	 FileCausal.forEach(v=>{
		myobj[v.filename]=[];
		
	 });
	 FileCausal.forEach(v=>{
		if( myobj[v.filename].indexOf(v.pos) < 0 ) {
			myobj[v.filename].push(v.pos);
		}
		myobj[v.filename].sort()
	 });
	 
	 //console.log(myobj);
     let locCount=0
	 for (let i in myobj){
		 locCount+=myobj[i].length;
	 }

	 /*
	 for( let i = 0; i < component.length; i++ ) {
	    fanout_id = tcc_fanoutlist[ i ].map( n => n.net.debug_id );
	    fanin_id = tcc_faninlist[ i ].map( n => n.net.debug_id );
	    tccFinFout[ component[ i ].debug_id ] = [ fanin_id, fanout_id ];
	    tccLocInfo[ component[ i ].debug_id ] = tcc_loc[ i ];
	    tccFinFoutName[ component[ i ].debug_name ] = [ fanin_id, fanout_id ];
	 }
	 */
	 
	 //let cycle = shortestCycle( tccFinFout , tccLocInfo );
	 let cycle = false;
	 
	 let tempFileList = [];
	 for( let i in tccLocInfo ){
	    if( tempFileList.indexOf( tccLocInfo[i].filename ) < 0 ) {
	       tempFileList.push( tccLocInfo[ i ].filename );
	    }
	 }
	 
	 let errorPosArray = [];
	 for( let j = 0 ; j < tempFileList.length ; j++ ) {
	    let errorPos = [];
	    for( let i in  tccLocInfo ) {
	       if( tccLocInfo[ i ].filename === tempFileList[ j ] ) {
		  if ( errorPos.indexOf( tccLocInfo[ i ].pos ) < 0 ) {
		     errorPos.push( tccLocInfo[ i ].pos );
		  }
	       }
	    }
	    errorPosArray.push( errorPos );
	 }
	 for( let i = 0; i < errorPosArray.length; i++ ) {
	    errorPosArray[ i ].sort( (a, b) => { return a - b ; } );
	 }
	 
	 // flag for not saving those components having only one position ?
	 let positionEntryFlag = false; 
	 // array of file names and positions
	 let tccCyclearray = []; 

	 for(let i = 0 ; i < tempFileList.length ; i++) {
	    // filenames and corresponding positions
	    let tccCycle = {}; 
	    if( errorPosArray[ i ].length > 1 ) {
	       // more than one position, hence flag set and info collected
	       positionEntryFlag = true; 
	       tccCycle.filename = tempFileList[ i ];
	       tccCycle.locations = errorPosArray[ i ];
	       tccCyclearray.push( tccCycle );
	    }
	 }

	 if( positionEntryFlag ) {
	    tarjanComponent[ j ] = tccCyclearray;
	 }
     //console.log(tccCyclearray);
	 let tempSignal = findCycleSignals( component[ 0 ] );
	 console.log("Signals length",tempSignal.length);
	 if( locCount ) {
	    if( cfg.debug > 0 && hop.isServer ) {
	       let myresult = Object.keys( myobj )
		  .map( key => tarjanComponent[ key ] );
	       let myJSON = JSON.stringify( myobj );
	       if( !fs ) fs = require( "fs" );
	    
	       fs.writeFileSync( hh.CAUSALITY_JSON, myJSON );
	    }
	    
	    return {
	       loc: myobj,
	       size: locCount,
	       signals: tempSignal
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
exports.findCausalityError = findCausalityError;
