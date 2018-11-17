"use hopscript"

const hh = require("hiphop");

const prg2 = function() {
   return <hh.module artist playlist>
     <hh.trap found>
       <hh.loop>
	 <hh.local candidateArtist candidatePlaylist>
	   <hh.exec candidateArtist apply=${function() {
	      setTimeout(() => this.notify("leartiste"), 90);
	   }}/>
	   <hh.exec candidatePlaylist apply=${function() {
	      setTimeout(() => this.notify("laplaylist"), 50);
	   }}/>
	   <hh.if apply=${function(){return this.candidatePlaylist.nowval}}>
	     <hh.sequence>
	       <hh.emit playlist apply=${function() {
		  return this.candidatePlaylist.nowval}}/>
	       <hh.emit artist apply=${function() {
		  return this.candidateArtist.nowval}}/>
	       <hh.exit found/>
	     </hh.sequence>
	   </hh.if>
	 </hh.local>
       </hh.loop>
     </hh.trap>
   </hh.module>;
}

const prg =
      <hh.module artist playlist exit>
	<hh.abort exit>
	  <hh.parallel>
	    <hh.run module=${prg2()} artist=artist playlist=playlist/>
	    <hh.every artist>
	      <hh.atom apply=${function() {
		 console.log("***ARTIST***", this.artist.nowval)
	      }}/>
	    </hh.every>
	    <hh.every playlist>
	      <hh.atom apply=${function() {
		 console.log("***PLAYLIST***", this.playlist.nowval)
	      }}/>
	    </hh.every>
	  </hh.parallel>
	</hh.abort>
      </hh.module>;


const m = new hh.ReactiveMachine(prg)
//console.log(m.ast.pretty_print());
m.react();
