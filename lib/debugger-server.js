"use hopscript"

const dcommon = require("./debugger-common.js");

//
// Hop.js server only code.
//
let tr = require(hop.tree);

//
// Map active debugger name to its ServerDebugger object.
//
let sdebugger_map = {};

//
// Generic viewer function
//
const _window_viewer = function(d_name, wd, stepper) {
   function print_program_tree(program_tree, open=true, setid=true) {
      let tid = program_tree.module_instance_id;
      let cur = wd.module_instance_id == tid;
      let name = program_tree.name;
      let url = program_tree.url;
      let stylecur = (cur ? "font-weight: bold; font-size:140%;" : "") +
	  "color:inherit;";
      let namecur = (name ? name : "MODULE") + "-" + tid;

      if (cur)
	 open = false;

      return <tr.tree open=${open} id=${setid ? "program-tree" : undefined}>
   	<tr.head>
	  <a style=${stylecur} href="#" onclick=~{pt_clicks_handlers[${tid}]()}>
            ${namecur}
	  </a>
   	</tr.head>
   	<tr.body>
   	     ${program_tree.children.map(function(c, i, a) {
   		return print_program_tree(c, open,  false);
   	     })}
   	</tr.body>
      </tr.tree>;
   }

   let stepper_toogle_btn = <button onclick=~{toogle_stepper()}></button>;
   let stepper_next_btn = <button onclick=~{next_stepper()}>
				      Next stepper
			  </button>;

   return <html>
     <head css=${tr.css} jscript=${tr.jscript}>
   	  ~{
   	     var code;
   	     var wd = ${wd};
   	     var seq = 0;
   	     var program_tree_expanded = true;
	     var pt_clicks_handlers = [];
	     var ws_sdebugger = null;
	     const delay = 300;

	     function mk_link(style, url, body) {
		let link = <a style=${style} href="#">${body}</a>;

		link.onclick = click_handler(url);
		return link;
	     }

	     function click_handler(url) {
		let clicks = 0;
		let timer = null;

		return function() {
		   clicks++;
		   if (clicks == 1) {
		      timer = setTimeout(function() {
			 clicks = 0;
			 window.open(url, "_parent");
		      }, delay);
		   } else {
		      clicks = 0;
		      clearTimeout(timer);
		      window.open(url, "_blank", "menubar=no,toolbar=no");
		   }
		}
	     }

   	     function handle_event(evt) {
   		let value = evt.value;

   		if (value.type == ${dcommon.DEBUGGER_UPDATE} &&
		    seq < value.seq) {
   		   seq = value.seq;
   		   update_wd(value.diff);
   		} else if (value.type == ${dcommon.DEBUGGER_DISABLE}) {
   		   debugger_disabled();
   		} else if (value.type == ${dcommon.STEPPER_ENABLE}) {
		   _stepper_ui_enable();
		} else if (value.type == ${dcommon.STEPPER_DISABLE}) {
		   _stepper_ui_disable();
		}
   	     }

   	     function update_wd(diff) {
   		let instr_list = wd.instruction_list;
   		diff.forEach(change => {
   		   if (change.type == "add") {
   		      instr_list.splice(change.line, 0, change.instr);
   		   } else if (change.type == "del") {
   		      instr_list.splice(change.line, 1);
   		   } else if (change.type == "chg") {
		      let w = instr_list[change.line].word_list[change.column];

		      if (change.fg_color)
			 w.fg_color = change.fg_color;

		      if (change.bg_color)
			 w.bg_color = change.bg_color;
   		   } else {
   		      throw new error.InternalError("Applying diff.", null);
   		   }
   		});
   		write_code();
   	     }

   	     function debugger_disabled() {
   		alert("The debugger has been disabled.");
   	     }

   	     function write_code() {
   		code.value = <div>
   		  <div id="code-title">${(wd.name ? wd.name : "MODULE")
					 + "-" + wd.module_instance_id}</div>
	            <div id="code-body">
   	          ${wd.instruction_list.map(function(instr) {
   		     return <div style=${"margin-left:"
					 + instr.indent * 3+ "em;"}>
                        ${instr.word_list.map(function(w, i) {
			   let style = "";
			   style += `background-color: ${w.bg_color};`;
			   style += `color: ${w.fg_color};`;
   			   return <span style=${style}>
                             ${(instr.url && i == 1
				? mk_link("color:inherit;", instr.url, w.body)
				: w.body)}</span>
   		        })}
   		     </div>;
   		  })}
		    </div>
		</div>
   	     }

   	     function toogle_program_tree() {
   		let btn = document.getElementById("toogle-program-tree");
   		let tree = document.getElementById("program-tree");

   		if (program_tree_expanded) {
   		   program_tree_expanded = false;
   		   btn.innerHTML = "Expand tree";
   		   HopTree.close(tree);
   		} else {
   		   program_tree_expanded = true;
   		   btn.innerHTML = "Collapse tree";
   		   HopTree.open(tree);
   		}
   	     }

	     function mk_pt_clicks_handlers(program_tree) {
		let tid = program_tree.module_instance_id;
		let url = program_tree.url;
		pt_clicks_handlers[tid] = click_handler(url);
		program_tree.children.forEach(c => mk_pt_clicks_handlers(c));
	     }

	     let stepper_state = false;
	     function toogle_stepper() {
		if (stepper_state) {
		   _stepper_ui_disable();
		   ws_sdebugger.send(JSON.stringify({
		      d_name: ${d_name},
		      type: ${dcommon.STEPPER_DISABLE}
		   }));
		} else {
		   _stepper_ui_enable();
		   ws_sdebugger.send(JSON.stringify({
		      d_name: ${d_name},
		      type: ${dcommon.STEPPER_ENABLE}
		   }));
		}
	     }

	     function _stepper_ui_enable() {
		stepper_state = true;
		${stepper_toogle_btn}.innerHTML = "Disable stepper";
		${stepper_next_btn}.style.display = "inline";
	     }

	     function _stepper_ui_disable() {
		stepper_state = false;
		${stepper_toogle_btn}.innerHTML = "Enable stepper";
		${stepper_next_btn}.style.display = "none";
	     }

	     function next_stepper() {
		if (stepper_state) {
		   ws_sdebugger.send(JSON.stringify({
		      d_name: ${d_name},
		      type: ${dcommon.STEPPER_NEXT}
		   }));
		}
	     }

   	     window.onload = function() {
   		code = new hop.reactProxy({value: ""});
   		write_code();
		mk_pt_clicks_handlers(wd.program_tree);
   		server.addEventListener(
   		   ${dcommon.svc_url(d_name, wd.module_instance_id)},
		   handle_event);

		if (${stepper})
		   _stepper_ui_enable();
		else
		   _stepper_ui_disable();

		window.addEventListener("keydown", function(evt) {
		   if (evt.key == "Enter") {
		      evt.preventDefault();
		      next_stepper();
		   }
		});

		let host = location.hostname;
		let port = location.port;
		ws_sdebugger = new WebSocket("ws://" + host + ":" + port +
					     "/hop/" + ${dcommon.VIEWER_WS});
   	     }
   	  }
     </head>
     <style>
       tr.hop-tree-row-selected {
	  background: inherit;
       }
     </style>
     <body style="font-family:mono;">
       <div style="float:left; width:20%;">
	 <div id="program-tree-container">
   	   <div>Program tree</div>
   	   <button id="toogle-program-tree"
   		   onclick=~{toogle_program_tree()}>Collapse tree</button>
   	      ${print_program_tree(wd.program_tree)}
	 </div>
       	 <div style="margin-top:5%;">
	   <div>Stepper</div>
	   ${stepper_toogle_btn}
	   ${stepper_next_btn}
	 </div>
       </div>
       <div style="margin-left: 20%;" id="code-container">
   	 <react>~{code.value}</react>
       </div>
     </body>
   </html>
}

//
// Server side debugger.
//
// The hopjs service at index i corresponds to the wd at index i.
//
// If the machine debugger runing on client, mdebugger is a websocket
// connected to it. Otherwise, mdebugger is the machinedebugger
// client.
//
const ServerDebugger = function(d_name, wd_list, mdebugger) {
   this.mdebugger_client = mdebugger.send instanceof Function ? true : false;
   this.mdebugger = mdebugger;
   this.stepper = false;
   this.wd_list = wd_list;
   this.seq = 0;
   this.name = d_name;
   this.hopjs_svc_list = wd_list.map((wd, idx, arr) => {
      return new Service(() => _window_viewer(d_name, wd_list[idx],
					      this.stepper),
   			 dcommon.svc_url(d_name, idx));
   });
   this.hopjs_svc_entrypoint =
      new Service(() => _window_viewer(d_name, wd_list[0], this.stepper),
		  d_name);
}

ServerDebugger.prototype.disable = function() {
   this.hopjs_svc_list.forEach((svc, idx, arr) => svc.unregister());
   this.hopjs_svc_entrypoint.unregister();
}

ServerDebugger.prototype.update = function(diff_list, seq) {
   this.seq = seq;
   diff_list.forEach((diff, i, arr) => {
      let instr_list = this.wd_list[i].instruction_list;

      hop.broadcast(dcommon.svc_url(this.name, i),
   		    { type:dcommon.DEBUGGER_UPDATE, seq: seq, diff: diff });
      diff.forEach(change => {
      	 if (change.type == "add") {
      	    instr_list.splice(change.line, 0, change.instr);
      	 } else if (change.type == "del") {
      	    instr_list.splice(change.line, 1);
      	 } else if (change.type == "chg") {
      	    let w = instr_list[change.line].word_list[change.column];

      	    if (change.fg_color)
      	       w.fg_color = change.fg_color;

      	    if (change.bg_color)
      	       w.bg_color = change.bg_color;
      	 } else {
      	    throw new error.InternalError("Applying diff.", null);
      	 }
      });
   });
}

ServerDebugger.prototype.update_stepper = function(state) {
   this.stepper = state;
   this.wd_list.forEach(
      (wd, i) => hop.broadcast(dcommon.svc_url(this.name, i),
			       { type: (state
					? dcommon.STEPPER_ENABLE
					: dcommon.STEPPER_DISABLE) }));
}

//
// WebSocketServer handling communication between reactive machine
// debugger which lives on client.
//
let wss_debugger = new WebSocketServer(dcommon.DEBUGGER_WS);

wss_debugger.onconnection = function(evt) {
   let ws_mdebugger = evt.value;

   ws_mdebugger.onmessage = function(evt) {
      let data = dcommon.parse_data(evt);

      if (!data)
	 return;

      if (data.type == dcommon.DEBUGGER_ENABLE) {
   	 enable_debugger(data.d_name, data.wd_list, ws_mdebugger);
      } else if (data.type == dcommon.DEBUGGER_UPDATE) {
   	 update_debugger(data.d_name, data.seq, data.diff_list);
      } else if (data.type == dcommon.DEBUGGER_DISABLED) {
   	 disable_debugger(data.d_name);
      }
   }

   ws_mdebugger.onclose = function(evt) {
      for (let d_name in sdebugger_map) {
   	 let d = sdebugger_map[d_name];

   	 if (d.ws_debugger == ws_debugger)
   	    disable_debugger(d_name);
      }
   }
}

//
// WebSocketSever handling communication between viewers client and
// server.
//
let wss_viewer = new WebSocketServer(dcommon.VIEWER_WS);

wss_viewer.onconnection = function(evt) {
   let ws_viewer = evt.value;

   ws_viewer.onmessage = function(evt) {
      let data = dcommon.parse_data(evt);
      if (!data)
	 return;

      let sd = sdebugger_map[data.d_name];
      if (!sd)
	 return;

      let cli = sd.mdebugger_client;

      if (data.type == dcommon.STEPPER_ENABLE) {
	 sd.update_stepper(true);
	 if (cli)
	    sd.mdebugger.send(evt.data);
	 else
	    sd.mdebugger.stepper_enable();
      } else if (data.type == dcommon.STEPPER_DISABLE) {
	 sd.update_stepper(false);
	 if (cli)
	    sd.mdebugger.send(evt.data);
	 else
	    sd.mdebugger.stepper_disable();
      } else if (data.type == dcommon.STEPPER_NEXT) {
	 if (cli)
	    sd.mdebugger.send(evt.data);
	 else
	    sd.mdebugger.stepper_next();
      }
   }
}

const update_debugger = function(d_name, seq, diff_list) {
   let d = sdebugger_map[d_name];

   if (d) {
      if (d.seq >= seq)
   	 return;
      d.update(diff_list, seq);
   }
};
exports.update_debugger = update_debugger;

//
// mdebugger is a MachineDebugger if debugger on server, or a
// websocket if the debugger lives on client.
//
const enable_debugger = function(d_name, wd_list, mdebugger) {
   let d = sdebugger_map[d_name];
   if (d)
      d.disable();

   sdebugger_map[d_name] = new ServerDebugger(d_name, wd_list, mdebugger);
};
exports.enable_debugger = enable_debugger;

const disable_debugger = function(d_name) {
   let d = sdebugger_map[d_name];

   if (d) {
      d.disable();
      delete sdebugger_map[d_name];
   }
};
exports.disable_debugger = disable_debugger;
