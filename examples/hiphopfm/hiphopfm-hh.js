const hh = require("hiphop");

module.exports = function(controlsView, genresView, detailView) {

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
	       getRandomTrackFromGenre(genre, doneReact);
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

   function hhSleepModule(ms) {
      let ids = [];
      return MODULE {
	 EXEC ids[EXECID] = setTimeout(DONEREACT, ms)
	 ONSUSP clearTimeout(ids[EXECID])
	 ONRES ids[EXECID] = setTimeout(DONEREACT, ms)
	 ONKILL clearTimeout(ids[EXECID]);
      }
   }

   function hhAudioModule() {
      let audio = new Audio();
      let errorListener = null;
      let endedListener = null;
      let loadedListener = null;

      function load(src) {
	 return new Promise(function(resolve) {
	    if (loadedListener) {
	       loadedListener = null;
	    }
	    loadedListener = function() { resolve() }
	    audio.onloadeddata = loadedListener;
	    audio.src = src;
	 });
      }

      function start() {
	 audio.play()

	 return new Promise(function(resolve, reject) {
	    if (errorListener) {
	       audio.removeEventListener("error", errorListener);
	    }
	    errorListener = function() { reject("error") };
	    audio.addEventListener("error", errorListener);

	    if (endedListener) {
	       audio.removeEventListener("ended", endedListener);
	    }
	    endedListener = function() { resolve("ended") };
	    audio.addEventListener("ended", endedListener);
	 })
      }

      return MODULE HiphopAudio (IN src, IN playPause, IN seekTo,
				 OUT paused, OUT trackEnded, OUT position, OUT duration, OUT error, OUT loaded) {
	 PROMISE loaded, error load(VAL(src));
	 TRAP Ended {
	    FORK {
	       SUSPEND TOGGLE(NOW(playPause)) EMITWHENSUSPENDED paused {
		  FORK {
		     PROMISE trackEnded, error start()
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

   const prg = MODULE {
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
   };

   controlsView.className = "hidden";
   detailView.style.display = "none";

   const machine = new hh.ReactiveMachine(prg, {sweep: false});
   machine.debuggerOn("debug");
   console.log((new hh.ReactiveMachine(prg)).stats());
   console.log(machine.stats());

   fma("genres", function(genres) {
      genres.forEach(function(genre) {
	 let button = <button id="genreButton" onclick=~{startGenre(genre)}>
	     	     ${genre.genre_title}
	 </button>
	 genresView.appendChild(button);
      });
   });

   return {
      machine: machine,
      toogleGenreDetailView: toogleGenreDetailView
   }
}
