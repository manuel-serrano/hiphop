/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/bourdoncle.js             */
/*    -------------------------------------------------------------    */
/*    Author      :  Jayanth Krishnamurthy                             */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Thu Apr 15 08:04:38 2021 (serrano)                */
/*    Copyright   :  2020-21 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop causality error messages                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const error = require( "./error.js" );
const hh = require( "./hiphop.js" );
const config = require( hop.config );
let fs = false;

/*---------------------------------------------------------------------*/
/*    findCausalityError ...                                           */
/*    ------------------------------------------------------------------------------------------*/
/*    Method attributed to Francois Bourdoncle, who uses Tarjan                         	*/
/*    algorithm recursively to build strongly connected sub            				*/
/*    components. The method will return subcompnents if any for a     				*/
/*    net in list format of all the connected nets for e.g for net     				*/
/*    1 the following list [1,2,3,[4,5,[10,11,12],6],7,8,9] is         				*/
/*    returned. From this the deepest [10,11,12] should be read and    				*/
/*    their repective positions will be displayed.                     				*/
/*    For cauality analysis debugging support, CausalityErrorTrace     				*/
/*    option should be set to "shallow" (for bigger cycle) or "deep"   				*/
/*    for (smallest cycle).  Default value set to "deep"                                          				*/
/*    e.g:                                                             				*/
/*    const machine = new hh.ReactiveMachine(examplemodulename,{CausalityErrorTrace:"shallow"});   */
/*----------------------------------------------------------------------------------------------*/
function findCausalityErrorDeep( machine, compilePhase = false ) {
   
    function bourdoncleTarjan( v ) {
	
	let P = [];
	let partition = [];
	let num = 0;
	
	function subComponent( vertex ) {
	   let partition = [];
	   let fanOut = vertex.fanout_list;
	   
	   for( let i=0; i < fanOut.length ; i++ ){
	      let w = fanOut[ i ].net;
	      if( w.LogicalNetType() !== "REG" ) {
		 if( w.dfn === 0 ) {
		    visit( w, partition );
		 }
	      }
	      
	   }
	   partition.push( vertex );
	   return partition;
	}
	
	function visit( v, partition ) {
	   if( v.LogicalNetType !== "REG" ) {
	      P.push( v );
	      num = num + 1;
	      v.dfn = num;
	      v.head = num;
	      let loop = false;
	      let min;
	      let element;
	      let fanOut = v.fanout_list;
	      
	      for( let i = 0; i < fanOut.length; i++ ) {
		 let w = fanOut[ i ].net;
		 if( w.LogicalNetType() !== "REG" ) {
		    if( w.dfn === 0 || w.dfn === undefined ){
		       min = visit( w, partition );
		    } else {
		       min = w.dfn;
		    }
		    if ( min <= v.head ) {
		       v.head = min;
		       loop = true;
		    }
		 }
	      }
	      
	      if( v.head === v.dfn )  {
		 v.dfn = +Infinity;
		 element = P.pop();
		 if( loop ) {
		    while( element !== v ) {
		       element.dfn = 0;
		       element = P.pop();
		    }
		    //partition.splice( 0,0,subComponent(v) );
		    partition.push( subComponent( v ) );
		 } else {
		    partition.push( v );
		 }
	      }
	      return v.head;
	   }
	   return ;
	}
	
	visit( v, partition );
	return partition;
    }
    
    function findCycleSignals( src ) {
	let res = [];
	for( let i=0; i < src.length; i++ ) {
	   if( src[i].accessor_list ) {
	      src[i].accessor_list.forEach( a => {
		    if( res.indexOf( a.signame ) < 0 ) {
		       res.push( a.signame );
		    }
		 });
	   }
	}
	return res;
    }
    
    function findCycleLength( ex_info ) {
       let resultCycle = [];
       let PosFlag = true;
       for( let key in ex_info ) {
	  let tempInfo = ex_info[ key ];
	  if( tempInfo.pos !== undefined ) {
	     if( resultCycle.indexOf( tempInfo) < 0 ) {
		resultCycle.push( tempInfo );
	     }
	  } else {
	     resultCycle.push( key );
	     PosFlag = false;
	  }   
       }
       if( PosFlag ){
	  resultCycle.sort( (a, b) => { return a.pos - b.pos ; } );
       }
       return {
	  cycle: resultCycle,
	  posFlag: PosFlag
       }
    }
    
    function findDeepestComp(array){
	let temp=[];
	temp = array.find( element => element.length > 1 );
	if( Array.isArray( temp ) ) {
	   return findDeepestComp( temp );
	}
	return array;
    }
    
    function cleanNets(){
       machine.nets.forEach( v=> {
             delete v.dfn;
             delete v.head;
	  } );
    }
    let nets = machine.nets.filter( n => !n.isInKnownList );
    nets.forEach( v => { v.dfn = 0; } );
    let tmpnetList = [];
    let compCount = 0;
    
    for( let i=0 ; i<nets.length ; i++ ) {
       if( nets[ i ].dfn === 0 ) {
	  let components = bourdoncleTarjan( nets[ i ] );
	  
	  if( compilePhase ) {
	     let tmpComp = findDeepestComp( components );
	     if( tmpComp.length === components.length ) {
		tmpnetList.push( components );
		compCount += components.length;
		if( compCount === nets.length ) {
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
	  
	  if( Array.isArray( components ) ) {
	     let tempStack = components;
	     let tarjanComponent = {};
	     
	     for( let j = 0 ; j < tempStack.length ; j++ ) {
		if( Array.isArray( tempStack[ j ] ) ) {
		   let solComponent = findDeepestComp( tempStack[ j ] );
		   let tcc_loc = solComponent.map( n => n.ast_node.loc );
		   let tccLocInfo = {};
		   
		   for( let i = 0; i < solComponent.length; i++ ) {
		      tccLocInfo[ solComponent[ i ].debug_id ] = tcc_loc[ i ];
		   }
		   
		   let { cycle,posFlag }= findCycleLength( tccLocInfo );
		   cycle.len = cycle.length;
		   let tempFileList = [];
		   let cycleLength = 0;
		   
		   if( posFlag ) {
		      let errorPosArray = [];
		      
		      for( let i in tccLocInfo ) {
			 if( tempFileList.indexOf( tccLocInfo[ i ].filename ) < 0 ) {
			    tempFileList.push( tccLocInfo[ i ].filename );
			 }
		      }
		      
		      for( let j = 0 ; j < tempFileList.length; j++ ) {
			 let errorPos = [];
			 
			 for( let i in  tccLocInfo ) {
			    if( tccLocInfo[ i ].filename === tempFileList[ j ] ){
			       if ( errorPos.indexOf( tccLocInfo[ i ].pos ) < 0 ){
				  errorPos.push( tccLocInfo[ i ].pos );
			       }
			    }
			 }
			 errorPosArray.push( errorPos );
			 cycleLength+=errorPos.length;
		      }
		      
		      for( let i = 0; i < errorPosArray.length; i++ ) {
			 errorPosArray[ i ].sort( (a, b) => { return a - b ; } );
		      }
		      
		      // flag for not saving those components having 
		      // only one position?
		      let positionEntryFlag = false; 
		      // array of file names and positions
		      let tccCyclearray = []; 
		      
		      for( let i = 0 ; i < tempFileList.length ; i++ ) {
			 // filenames and corresponding positions
			 let tccCycle = {}; 
			 
			 if( errorPosArray[ i ].length > 1 ) {
			    // more than one position, hence flag 
			    // set and info collected
			    positionEntryFlag = true; 
			    tccCycle.filename = tempFileList[ i ];
			    tccCycle.locations = errorPosArray[ i ];
			    tccCyclearray.push( tccCycle );
			 }
		      }
		      if( positionEntryFlag ){
			 tarjanComponent[j] = tccCyclearray;
		      }
		      cycle.len = cycleLength;
		   }

		   let tempSignal = findCycleSignals( solComponent );
		   if( cycle ) {
		      let  finalResult = Object.keys( tarjanComponent )
			 .map( key => tarjanComponent[ key ] );
		      
		      let myJSON = JSON.stringify( finalResult );
		      let resultStr='';
		      if( posFlag ) {
			 // if locations are available to print
			 if( config.debug > 0 && hop.isServer ) {
			    if( !fs ) fs = require( "fs" );
			    fs.writeFileSync( hh.CAUSALITY_JSON, myJSON );
			 }
			 
			 if( !compilePhase ) {
				resultStr+='\n'
				for( let i=0; i<finalResult.length; i++ ) {
					finalResult[i].forEach( v => {
						let pos = v["locations"];
						let fname = v["filename"];
						pos.forEach( i=>{
						    resultStr+=`file:${fname}:${i}`
						    resultStr+='\n'
						});
					});
				}
			 }
		      }
		      
		      // remove nets.dfn and nets.head
		      cleanNets();
		      
		      return {
			 loc: myJSON,
			 size: cycle.len,
			 signals: tempSignal,
			 posFlag: posFlag,
			 result: resultStr
		      }
		   }
		}
	     }
	  }
       }
    }
    
    cleanNets();// remove nets.dfn and nets.head
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
