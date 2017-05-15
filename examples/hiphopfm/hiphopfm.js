"use hopscript"

require("hiphop");
const path = require("path");
const dir = path.dirname(module.filename);

service hiphopfm() {
   return <html>
     <head module="hiphop" css=${dir + "/styles.css"}>
       <meta name="viewport" content="width=device-width">
       ~{
	  var machine;
	  var audioController = new Audio();
	  var controlsView;
	  var genresView;
	  var detailView;

          const random = function(max) {
	     return Math.floor(Math.random() * max);
	  }

	  const fma = function(dataset, callback, opt={}) {
	     let addr = `https://freemusicarchive.org/api/get/${dataset}.json`;
	     addr += "?api_key=49T6MKJCF929XKN3";
	     addr += "&limit=50";
	     for (let el in opt) {
		addr += `&${el}=${opt[el]}`;
	     }

	     let req = new XMLHttpRequest();
	     req.onreadystatechange = () => {
		if (req.readyState == 4 && req.status == 200) {
		   callback(JSON.parse(req.response).dataset);
		}
	     }
	     req.open("GET", addr, true);
	     req.send();
	  }

	  const startGenre = function(genre) {
	     machine.inputAndReact("GENRE", genre);
	     toogleGenreDetailView();
	  }

	  const toogleGenreDetailView = function() {
	     let toogleBtn = document.getElementById("genreSelectionButton");
	     if (genresView.style.display == "none") {
		genresView.style.display = "block";
		detailView.style.display = "none";
		toogleBtn.innerHTML = "Track details";
	     } else {
		controlsView.className = "";
		genresView.style.display = "none";
		detailView.style.display = "block";
		toogleBtn.innerHTML = "Genre selection";
	     }
	  }

	  const getRandomTrackFromGenre = function(genre, callback) {
	     fma("albums", albums => {
		fma("tracks", tracks => {
		   let track = tracks[random(tracks.length)];
		   if (track) {
		      callback(track);
		   } else {
		      getRandomTrackFromGenre(genre, callback);
		   }
		}, {album_id: albums[random(albums.length)].album_id});
	     }, {genre_handle: genre.genre_handle});
	  }

	  window.onload = function() {
	     const hh = require("hiphop");
	     const tl = hh.timelib;

	     const hhAudioModule = function() {
		let audioMap = [];
		let curId;
		return <hh.module SRC PLAYPAUSE SEEKTO
                                  PAUSED TRACKENDED POSITION DURATION>
		  <hh.trap ENDED>
		    <hh.parallel>
		      <hh.suspend toogleSignal=PLAYPAUSE emitWhenSuspended=PAUSED>
			<hh.parallel>
			  <hh.sequence>
			    <hh.exec TRACKENDED
                              apply=${function() {
				 let audio = new Audio(this.value.SRC);
				 audio.play()
				 audio.addEventListener("ended", () => {
				    this.notifyAndReact("ended");
				 });
				 audio.addEventListener("error", () => {
				    this.notifyAndReact("error");
				 });
				 audioMap[this.id] = audio;
				 curId = this.id;
		              }}
			      res=${function() {
				 audioMap[this.id].play();
			      }}
			      susp=${function() {
				 audioMap[this.id].pause();
			      }}
			      kill=${function() {
				 audioMap[this.id].pause();
				 delete audioMap[this.id];
			      }}/>
                            <hh.exit ENDED/>
			  </hh.sequence>
			  <hh.sequence>
			    <tl.awaitTick/>
			    <hh.exec DURATION apply=${function() {
			       audioMap[curId].addEventListener("durationchange", () => {
				  this.notifyAndReact(audioMap[curId].duration);
			       });
			    }}/>
			  </hh.sequence>
			  <tl.interval value="1000">
			    <hh.emit POSITION apply=${function() {
			       return audioMap[curId].currentTime;
			    }}/>
			  </tl.interval>
			</hh.parallel>
		      </hh.suspend>
		      <hh.every SEEKTO>
			<hh.atom apply=${function() {
			   audioMap[curId].currentTime = this.value.SEEKTO;
			}}/>
		      </hh.every>
		    </hh.parallel>
		  </hh.trap>
		</hh.module>
	     }

	     machine = new hh.ReactiveMachine(
		<hh.module GENRE NEXT PLAYPAUSE SEEKTO
		           PAUSED TRACKENDED POSITION DURATION TRACK BIO DISCO>
		  <hh.every immediate GENRE>
		    <hh.loop>
		      <hh.trap NEXTTRACK>
			<hh.parallel>
			  <hh.sequence>
			    <hh.await NEXT/>
			    <hh.exit NEXTTRACK/>
			  </hh.sequence>
			  <hh.sequence>
			    <hh.emit BIO DISCO value=" "/>
			    <hh.exec TRACK apply=${function() {
			       getRandomTrackFromGenre(this.value.GENRE,
						       this.notifyAndReact);
			    }}/>
			    <hh.parallel>
			      <hh.local SRC=${{initApply: function() {
				 return this.value.TRACK.track_url + "/download"}}}>
				<hh.run module=${hhAudioModule()}/>
				<hh.exit NEXTTRACK/>
			      </hh.local>
			      <hh.exec BIO apply=${function() {
				 fma("artists", data => {
				    this.notifyAndReact(data[0].artist_bio);
				 }, {artist_id: this.value.TRACK.artist_id})
			      }}/>
			      <hh.exec DISCO apply=${function() {
				 fma("albums", data => {
				    this.notifyAndReact(data);
				 }, {artist_id: this.value.TRACK.artist_id})
			      }}/>
			    </hh.parallel>
			  </hh.sequence>
			</hh.parallel>
		      </hh.trap>
		    </hh.loop>
		  </hh.every>
		</hh.module>
	     );
	     machine.react();
	     machine.debuggerOn("debug");

	     controlsView = document.getElementById("controlsView");
	     genresView = document.getElementById("genresView");
	     detailView = document.getElementById("detailView");
	     controlsView.className = "hidden";
	     detailView.style.display = "none";

	     fma("genres", genres => {
	     	genres.forEach(genre => {
	     	   let button = <button id="genreButton" onclick=~{startGenre(genre)}>
	     	     ${genre.genre_title}
		   </button>
	     	   genresView.appendChild(button);
	     	});
	     });
	  }
       }
     </head>
     <body>
       <div id="controlsView">
	 <input id="durationControl" type="range" step="1"
		min="0" max=~{machine.value.DURATION}
		value=~{machine.value.POSITION}
		onchange=~{machine.inputAndReact("SEEKTO", this.value)}/>
	 <button id="genreSelectionButton"
                 onclick=~{toogleGenreDetailView()}>
	     &nbsp;
	 </button>
	 <button id="playPauseButton"
		 onclick=~{machine.inputAndReact("PLAYPAUSE")}
		 class=~{machine.present.PAUSED ? "paused" : "playing"}>
	     &nbsp;
	 </button>
	 <button id="nextButton"
                 onclick=~{machine.inputAndReact("NEXT")}>
	     Next track
	 </button>
       </div>
       <div id="genresView">
       </div>
       <div id="detailView">
	 <div id="currentPlayingView">
	   <div>
	     <react>~{
		let track = machine.value.TRACK;
		if (track) {
		   return <div>
		     <h2>${track.artist_name} - ${track.track_title}</h2>
		     ${(() => {
			function s2m(secs) {
			   return Math.floor(secs / 60) + ":" + Math.floor(secs % 60);
			}
			let pos = machine.value.POSITION;
			let dur = machine.value.DURATION;
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
		  let track = machine.value.TRACK
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
	      if (machine.value.BIO != " ") {
		 let bio = machine.value.BIO;
		 let div = document.createElement("div");
		 div.innerHTML = machine.value.BIO;
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
	      if (machine.value.DISCO instanceof Array
		  && machine.value.DISCO.length > 0) {
	       	 return <div>
		   <h3>Discography</h3>
		   <ul>
	       	    ${machine.value.DISCO.map(album => <li>${album.album_title}</li>)}
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
