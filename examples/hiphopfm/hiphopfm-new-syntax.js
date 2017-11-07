"use hopscript"

require("hiphop");
const path = require("path");
const dir = path.dirname(module.filename);

service hiphopfm() {
   return <html>
     <head module="hiphop" css=${dir + "/styles.css"}>
       <meta name="viewport" content="width=device-width"/>
       ~{
	  var machine;
	  var controlsView;
	  var genresView;
	  var detailView;

          function random(max) {
	     return Math.floor(Math.random() * max);
	  }

	  function fma(dataset, callback, opt={}) {
	     let addr = `https://freemusicarchive.org/api/get/${dataset}.json`;
	     addr += "?api_key=49T6MKJCF929XKN3";
	     addr += "&limit=50";
	     for (let el in opt) {
		addr += `&${el}=${opt[el]}`;
	     }

	     let req = new XMLHttpRequest();
	     req.onreadystatechange = function() {
		if (req.readyState == 4 && req.status == 200) {
		   callback(JSON.parse(req.response).dataset);
		}
	     }
	     req.open("GET", addr, true);
	     req.send();
	  }

	  function startGenre(genre) {
	     machine.inputAndReact("genre", genre);
	     toogleGenreDetailView();
	  }

	  function toogleGenreDetailView() {
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

	  function getRandomTrackFromGenre(genre, doneReact) {
	     fma("albums", function(albums) {
		fma("tracks", function(tracks) {
		   let track = tracks[random(tracks.length)];
		   if (track) {
		      doneReact(track);
		   } else {
		      getRandomTrackFromGenre(genre, callback);
		   }
		}, {album_id: albums[random(albums.length)].album_id});
	     }, {genre_handle: genre.genre_handle});
	  }

	  function getBio(artistId, doneReact) {
	     fma("artist", function(data) { doneReact(data[0].artist_bio), {artist_id: artistId} });
	  }

	  function getDisco(artistId, doneReact) {
	     fma("albums", function(data) { doneReact(data), {artist_id: artistId} });
	  }

	  window.onload = function() {
	     const hh = require("hiphop");

	     function hhSleepModule(ms) {
		let id;
		return MODULE {
		   EXEC id = setTimeout(DONEREACT, ms)
		      ONSUSP clearTimeout(id)
		      ONRES id = setTimeout(DONEREACT, ms)
		      ONKILL clearTimeout(id);
		}
	     }

	     function hhAudioModule() {
		let audio = new Audio();
		let errorListener = null;
		let endedListener = null;

		function start(src, doneReact) {
		   audio.src = src;
		   audio.play()

		   if (errorListener) {
		      audio.removeEventListener("error", errorListener);
		   }
		   errorListener = function() { doneReact("ended") };
		   audio.addEventListener("error", errorListener);

		   if (endedListener) {
		      audio.removeEventListener("ended", endedListener);
		   }
		   endedListener = function() { doneReact("error") };
		   audio.addEventListener("ended", endedListener);
		}

		return MODULE HiphopAudio {
		   IN src, playPause, seekTo;
		   OUT paused, trackEnded, position, duration;
		   TRAP Ended {
		      FORK {
			 SUSPEND TOGGLE(NOW(playPause)) EMITWHENSUSPENDED paused {
			    FORK {
			       EXECEMIT trackEnded start(VAL(src), DONEREACT)
			          ONRES audio.play()
			          ONSUSP audio.pause()
			          ONKILL audio.pause();
			       EXIT Ended;
			    } PAR {
			       LOOP {
				  RUN(hhSleepModule(1000));
				  EMIT position(audio.currentTime);
				  EMIT duration(audio.duration);
			       }
			    }
			 }
		      } PAR {
			 EVERY(NOW(seekTo)) {
			    ATOM {
			       audio.currentTime = VAL(seekTo);
			    }
			    EMIT position(audio.currentTime);
			 }
		      }
		   }
		}
	     }

	     machine = new hh.ReactiveMachine(MODULE {
		IN genre, next, playPause, seekTo;
		OUT paused, trackEnded, position, duration, track, bio, disco;
		EVERY IMMEDIATE(NOW(genre)) {
		   LOOP {
		      TRAP NextTrack {
			 FORK {
			    AWAIT(NOW(next));
			    EXIT NextTrack;
			 } PAR {
			    EMIT bio(" "), disco(" ");
			    EXECEMIT track getRandomTrackFromGenre(VAL(genre), DONEREACT);
			    FORK {
			       LOCAL src(VAL(track).track_url + "/download") {
				  RUN(hhAudioModule());
				  EXIT NextTrack;
			       }
			    } PAR {
			       EXECEMIT bio getBio(VAL(track).artist_id, DONEREACT);
			    } PAR {
			       EXECEMIT disco getDisco(VAL(track).artist_id, DONEREACT);
			    }
			 }
		      }
		   }
		}
	     });
	     machine.debuggerOn("debug");

	     controlsView = document.getElementById("controlsView");
	     genresView = document.getElementById("genresView");
	     detailView = document.getElementById("detailView");
	     controlsView.className = "hidden";
	     detailView.style.display = "none";

	     fma("genres", function(genres) {
	     	genres.forEach(function(genre) {
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
