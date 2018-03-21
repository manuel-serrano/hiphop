"use hopscript"

require("hiphop");
const path = require("path");
const dir = path.dirname(module.filename);

service hiphopfm() {
   return <html>
     <head css=${dir + "/styles.css"}>
       <meta name="viewport" content="width=device-width"/>
       <script src="hiphop" lang="hopscript"/>
       <script src="./hiphopfm-hh.js" lang="hiphop"/>
       ~{
	  var toogleGenreDetailView;
	  var machine;
	  window.onload = function() {
	     var controlsView = document.getElementById("controlsView");
	     var genresView = document.getElementById("genresView");
	     var detailView = document.getElementById("detailView");
	     var hhfm = (require("./hiphopfm-hh.js", "hiphop"))(controlsView, genresView, detailView);
	     machine = hhfm.machine;
	     toogleGenreDetailView = hhfm.toogleGenreDetailView;
	  }
       }
     </head>
     <body>
       <div id="controlsView">
	 <input id="durationControl" type="range" step="1"
		min="0" max=~{machine.value.duration}
		value=~{machine.value.position}
		onchange=~{machine.inputAndReact("seekTo", this.value)}/>
	 <button id="genreSelectionButton"
                 onclick=~{toogleGenreDetailView()}>
	     &nbsp;
	 </button>
	 <button id="playPauseButton"
		 onclick=~{machine.inputAndReact("playPause")}
		 class=~{machine.present.paused ? "paused" : "playing"}>
	     &nbsp;
	 </button>
	 <button id="nextButton"
                 onclick=~{machine.inputAndReact("next")}>
	     Next track
	 </button>
       </div>
       <div id="genresView">
       </div>
       <div id="detailView">
	 <div id="currentPlayingView">
	   <div>
	     <react>~{
		let track = machine.value.track;
		if (track) {
		   return <div>
		     <h2>${track.artist_name} - ${track.track_title}</h2>
		     ${(function() {
			function s2m(secs) {
			   return Math.floor(secs / 60) + ":" + Math.floor(secs % 60);
			}
			let pos = machine.value.position;
			let dur = machine.value.duration;
			if (!isNaN(pos) && !isNaN(dur)) {
			   return <h5>${s2m(pos)}/${s2m(dur)}</h5>
			} else {
			   return "";
			}
		     }())}
		   </div>
		} else {
		   return " ";
		}
	     }</react>
	   </div>
	   <div>
	     <react>
	       ~{
		  let track = machine.value.track
		  if (track && track.track_image_file) {
		     return <img src=${track.track_image_file}/>
		  } else {
		     return " "
		  }
	       }
	     </react>
	   </div>
	 </div>
	 <div id="bioView">
	   <react>~{
	      if (machine.value.bio != " ") {
		 let bio = machine.value.bio;
		 let div = document.createElement("div");
		 div.innerHTML = machine.value.bio;
		 return <div>
		   <h3>Biography</h3>
		   ${div}
		 </div>;
	      } else {
		 return <em>No biography availible</em>;
	      }
	   }</react>
	 </div>
	 <div id="discoView">
	   <react>~{
	      if (machine.value.disco instanceof Array
		  && machine.value.disco.length > 0) {
	       	 return <div>
		   <h3>Discography</h3>
		   <ul>
	       	    ${machine.value.disco.map(function(album) { return <li>${album.album_title}</li>})}
	       	   </ul>
		 </div>;
	      } else {
	       	 return <em>No discography availible</em>;
	      }
 	   }</react>
	 </div>
       </div>
   </body>
   </html>
}
