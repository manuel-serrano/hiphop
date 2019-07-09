/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/causality.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Tue Jul  9 12:00:08 2019 (serrano)                */
/*    Copyright   :  2019 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop causality error messages                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    findCausalityError ...                                           */
/*---------------------------------------------------------------------*/
function findCausalityError( machine ) {

   function min( a, b ) {
      return a < b ? a : b;
   }

   function tarjan( net ) {
      // https://fr.wikipedia.org/wiki/Algorithme_de_Tarjan
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

    let nets = machine.nets.filter( n => !n.isInKnownList );
    let components = tarjan( nets );

// error messages
    for( let j = 0 ; j < components.length ; j++ ){

    if( components[ j ].length > 1 ){   // more than one nets should be in a compnent ? no single element loops??
    let tcc_debug_id = components[ j ].map( n => n.debug_id );// get the debug ids of all participating nets in a strongly connected compnent
    let tcc_loc = components[ j ].map( n => n.ast_node.loc );// respective positions

    let tcc_fanoutlist = components[ j ].map( n => n.fanout_list );// fanout list of each of the nets
   //console.log(tcc_fanoutlist);


    let fanout_id = [];
  //  console.log(tcc_loc);
    let tcc_dict = {};
    let tcc_info = {};
    for( let i = 0 ; i < tcc_debug_id.length ; i++ ){
        fanout_id = tcc_fanoutlist[i].map( n => n.net.debug_id );
        tcc_dict[ tcc_debug_id[ i ]] = fanout_id;
        tcc_info[ tcc_debug_id[ i ]] = tcc_loc[ i ];
    }
  //  console.log(tcc_dict);//to check cycles
    shortestCycle( tcc_dict , tcc_info );
  }
}

   function shortestCycle( ex_dict, ex_info ){

    let resultCycle = [];


     for( let key in ex_dict ) {

         let shortestCycleLength =  findcycle( ex_dict , key );
      //  console.log(key, "cycle length ",shortestCycleLength, ex_info[key]); //shortest cycle length ??

         if( resultCycle.indexOf( ex_info[ key ]) < 0 ){
             resultCycle.push( ex_info[ key ] );
         }

    }


    resultCycle.sort( (a, b) => { return a.pos - b.pos ; } ); //sort based on buffer position

    if( resultCycle.length > 1 ){
      for( let i = 0 ; i < resultCycle.length ; i++ ){
      console.error(`causality error in file: ${resultCycle[i].filename} at position ${resultCycle[i].pos}`);
        }
      }

}

   function findcycle( ex_dict, my_key ){
          let bfsKey_q = [];
          let count = 1;
          let item = ex_dict[ my_key ];
          let done = false;
          let  myresult = Object.keys(item).map(function(key) {
            return item[ key ];
              });

          for( let i = 0 ; i < myresult.length ; i++ ){
                        bfsKey_q.push( myresult[ i ] );
                    }
          while( !done ){
            let found = bfsKey_q.findIndex( function( element ){
                return element === Number(my_key); // element type is number
              });

            if( found > -1 ){
                    done = true;
                    break;
                  }
            count += 1;
            let qLength = bfsKey_q.length;
            for(let i = 0 ; i < qLength ; i++ ){
              let new_v = bfsKey_q[i];
              item = ex_dict[new_v];
              if( item === undefined ){
                        continue;
                      }
              myresult = Object.keys(item).map(function(key) {
                          return item[key];
                });
            for( let i = 0 ; i < myresult.length ; i++ ){
                          bfsKey_q.push( myresult[ i ] );
                      }
            }
            for( let i = 0 ; i < qLength ; i++ ){
                    bfsKey_q.shift();
                  }
          }
        return count;
 }



   let head = nets.find( n => isCyclic( n ) );

   if( head ) {
      return {
	 loc: head.ast_node.loc,
	 size: cycleSize( head ),
	 signals: findCycleSignals( head ) }
   } else {
      return {
	 loc: false,
	 size: -1,
	 signals: []
      };
   }
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.findCausalityError = findCausalityError;
