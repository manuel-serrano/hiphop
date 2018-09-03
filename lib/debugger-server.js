"use hopscript"

const error = require("./error.js");
const dcommon = require("./debugger-common.js");

//
// Hop.js server only code.
//
let tr = require(hop.tree);

//
// Map active debugger name to its ServerDebugger object.
//
let sdebugger_map = {};

/*---------------------------------------------------------------------*/
/*    indent_margin_left_factor                                        */
/*---------------------------------------------------------------------*/
const indent_margin_left_factor = 1.05;
//
// Generic viewer function
//
const _window_viewer = function(d_name, wd, stepper, watchpoint) {
   function print_program_tree(program_tree, open=true, setid=true) {
      let tid = program_tree.module_instance_id;
      let cur = wd.module_instance_id == tid;
      let name = program_tree.name;
      let url = program_tree.url;
      let stylecur = (cur ? "font-weight: bold; font-size:140%;" : "") +
	  "color:inherit;";
      let namecur = (name ? name : "MODULE") + tid;

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
   let stepper_steps_input = <input id="stepinput" value=1 min=0 type=number step=1/>;
   let stepper_next_btn = <button onclick=~{
      let steps = parseInt(${stepper_steps_input}.value);
      next_stepper(steps);
   }>Next step</button>;

   return <html>
     <head css=${tr.css} jscript=${tr.jscript}>
       <style>
	 #stepinput {
	    width: 40px;
	 }
       </style>
   	  ~{
   	     var code;
   	     var wd = ${wd};
	     var stepper_ui_p;
	     var watchpoint_ui_p;
   	     var program_tree_expanded = true;
	     var pt_clicks_handlers = [];
	     var ws_sdebugger = null;
	     var recv_seq = 0;
	     var send_seq = 0;
	     var recv_queue = [];
	     var send_queue = [];
	     var delay = 300;

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

		      if (change.signal_value)
			 w.signal_value = change.signal_value;
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
					 + wd.module_instance_id}</div>
	            <div id="code-body">
   	          ${wd.instruction_list.map(function(instr) {
   		     return <div style=${"margin-left:"
					 + instr.indent * ${indent_margin_left_factor} + "em;"}>
                        ${instr.word_list.map(function(w, i) {
			   let t = "signal_value" in w ? w.signal_value : "";
			   let style = "";
			   style += `background-color: ${w.bg_color};`;
			   style += `color: ${w.fg_color};`;
   			   return <span title=${t}
					style=${style}
					onclick=${function() {
					   if ("signal_value" in w) {
					      console.log(w.signal_value);
					      alert(w.signal_value);
					   }
					}}>
                             ${(instr.url && i == 1
				? mk_link("color:inherit;", instr.url, w.body)
				: w.body)}</span>;
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
		   send({ d_name: ${d_name}, type: ${dcommon.STEPPER_DISABLE} })
		} else {
		   _stepper_ui_enable();
		   send({ d_name: ${d_name}, type: ${dcommon.STEPPER_ENABLE} })
		}
	     }

	     function _stepper_ui_enable() {
		stepper_state = true;
		${stepper_toogle_btn}.innerHTML = "Disable stepper";
		${stepper_next_btn}.style.display = "inline";
		${stepper_steps_input}.style.display = "inline";
		stepper_ui_p.display = "block";
	     }

	     function _stepper_ui_disable() {
		stepper_state = false;
		${stepper_toogle_btn}.innerHTML = "Enable stepper";
		${stepper_next_btn}.style.display = "none";
		${stepper_steps_input}.style.display = "none";
		stepper_ui_p.display = "none";
	     }

	     function next_stepper(steps) {
		if (isNaN(steps) || steps < 1) {
		   steps = 1;
		}
		if (stepper_state) {
		   send({ d_name: ${d_name},
			  type: ${dcommon.STEPPER_NEXT},
			  steps: steps })
		}
	     }

	     function stepper_update(remains, steps) {
		stepper_ui_p.remains = remains;
		stepper_ui_p.steps = steps;
	     }

	     function send(msg) {
		msg.d_name = ${d_name}
		msg.module_instance_id = ${wd.module_instance_id}
		msg.seq = ++send_seq;
		ws_sdebugger.send(JSON.stringify(msg));
	     }

	     function _watchpoint_ui_update(expr, state, reached=false) {
		watchpoint_ui_p.expr = expr;
		watchpoint_ui_p.reached = reached;
		switch (state) {
		case ${dcommon.WATCHPOINT_ENABLE}:
		   watchpoint_ui_p.color = "green";
		   break;
		case ${dcommon.WATCHPOINT_DISABLE}:
		   watchpoint_ui_p.color = "black";
		   break;
		case ${dcommon.WATCHPOINT_REACHED}:
		   watchpoint_ui_p.color = "grey";
		   break;
		case ${dcommon.WATCHPOINT_INVALID}:
		   watchpoint_ui_p.color = "red";
		   break;
		}
	     }

	     function update_watchpoint_expr(evt, expr) {
		let keycode = evt.keyCode | evt.which;

		if (keycode != 13)
		   return;

		if (expr != "") {
		   send({ type: ${dcommon.WATCHPOINT_ENABLE},
			  watchpoint_expr: expr });
		} else {
		   send({ type: ${dcommon.WATCHPOINT_DISABLE} });
		}
	     }

   	     window.onload = function() {
   		code = new hop.reactProxy({value: ""});
		stepper_ui_p = new hop.reactProxy({remains: 0,
						   steps: 0,
						   display: "none"});
		watchpoint_ui_p = new hop.reactProxy({expr: null,
						      color: null,
						      reached: null});
		_watchpoint_ui_update(${watchpoint.expr},
				      ${watchpoint.state});

   		write_code();
		mk_pt_clicks_handlers(wd.program_tree);

		if (${stepper}) {
		   stepper_ui_p.remains = ${stepper}.remains;
		   stepper_ui_p.steps = ${stepper}.steps;
		   _stepper_ui_enable();
		} else {
		   _stepper_ui_disable();
		}

		window.addEventListener("keydown", function(evt) {
		   if (evt.key == "Enter") {
		      evt.preventDefault();
		      next_stepper(1);
		   }
		});

		let host = location.hostname;
		let port = location.port;
		ws_sdebugger = new WebSocket("ws://" + host + ":" + port +
					     "/hop/" + ${dcommon.VIEWER_WS});

		ws_sdebugger.onopen = function() {
		   send({ type: ${dcommon.VIEW_HELLO} });
		   send_queue.forEach(msg => ws_sdebugger.send(msg));
		   //
		   // Never used anymore.
		   //
		   send_queue = null;
		}

		ws_sdebugger.onmessage = function(evt) {
		   let msg = null;

		   try {
		      msg = JSON.parse(evt.data);
		   } catch (e) {
		      msg = null;
		   }

		   let apply_msg = msg => {
		      recv_seq++;
		      switch (msg.type) {
		      case ${dcommon.DEBUGGER_UPDATE}:
			 update_wd(msg.diff);
			 break;
		      case ${dcommon.DEBUGGER_DISABLE}:
			 debugger_disable();
			 break;
		      case ${dcommon.STEPPER_ENABLE}:
			 stepper_update(msg.remains, msg.steps);
			 _stepper_ui_enable();
			 break;
		      case ${dcommon.STEPPER_DISABLE}:
			 _stepper_ui_disable();
			 break;
		      case ${dcommon.STEPPER_UPDATE}:
			 stepper_update(msg.remains, msg.steps);
			 break;
		      case ${dcommon.WATCHPOINT_ENABLE}:
			 _watchpoint_ui_update(msg.watchpoint_expr,
					       ${dcommon.WATCHPOINT_ENABLE});
			 break;
		      case ${dcommon.WATCHPOINT_DISABLE}:
			 _watchpoint_ui_update("",
					       ${dcommon.WATCHPOINT_DISABLE});
			 break;
		      case ${dcommon.WATCHPOINT_REACHED}:
			 _watchpoint_ui_update(watchpoint_ui_p.expr,
					       ${dcommon.WATCHPOINT_REACHED},
					       true);
			 stepper_update(msg.remains, msg.steps);
			 _stepper_ui_enable();
			 break;
		      case ${dcommon.WATCHPOINT_INVALID}:
			 _watchpoint_ui_update(watchpoint_ui_p.expr,
					       ${dcommon.WATCHPOINT_INVALID});
			 break;
		      }
		   }

		   if (!msg) {
		      console.log("Hiphop.js debugger: receive empty " +
				  "message. Bug?");
		   } else if (msg.seq <= recv_seq) {
		      console.log("Hiphop.js debugger: receive message " +
				  "seq <= recv_seq. Bug?");
		   } else if (msg.seq > recv_seq + 1) {
		      let inserted = false;

		      for (let i in recv_queue) {
			 if (recv_queue[i].seq > msg.seq) {
			    recv_queue.splice(i, 0, msg);
			    inserted  = true;
			    break;
			 }
		      }
		      
		      if (!inserted)
			 recv_queue.push(msg);
		   } else if (msg.seq == recv_seq + 1) {
		      apply_msg(msg);
		   } else {
		      console.log("Hiphop.js debugger: receive message "
				  + "invalid seq. Bug?");
		   }

		   recv_queue.forEach((msg, i, q) => {
		      if (msg.seq == recv_seq + 1) {
			 q.splice(i, 1);
			 apply_msg(msg);
		      }
		   });
		}

		ws_sdebugger.onclose = function() {
		   //alert("Hiphop.js debugger connection closed.");
		   location.reload()
		}
   	     }
   	  }
     </head>
     <style>
       tr.hop-tree-row-selected {
	  background: inherit;
       }
     </style>
     <body style="font-family:monospace;">
       <div>
	 Watchpoint expr
	 <input size=80 type="text"
		style=~{`color:${watchpoint_ui_p.color};`}
		value=~{watchpoint_ui_p.expr}
		onkeyup=~{update_watchpoint_expr(event, this.value)}/>
	 <div><react>~{
	    if (watchpoint_ui_p.reached) {
	       setTimeout(() => watchpoint_ui_p.reached = false, 3000);
	       return "WATCHPOINT REACHED. STEPPER ENABLED.";
	    } else {
	       return " ";
	    }
	 }</react></div>
       </div>
       <div style="float:left; width:20%;">
	 <div id="program-tree-container">
   	   <div>Program tree</div>
   	   <button id="toogle-program-tree"
   		   onclick=~{toogle_program_tree()}>Expand tree</button>
   	      ${print_program_tree(wd.program_tree)}
	 </div>
       	 <div style="margin-top:5%;">
	   <div>Stepper</div>
	   ${stepper_toogle_btn}
	   ${stepper_steps_input}
	   ${stepper_next_btn}
	   <div style=~{`display:${stepper_ui_p.display}`}>
	     <div>remains:<span><react>~{stepper_ui_p.remains}</react></span></div>
             <div>steps:<span><react>~{stepper_ui_p.steps}</react></span></div>
	   </div>
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
// mdebugger_ws and viewer ws always send the first message. Hence,
// the connection is aleay established (or broken) when the server try
// to send message to them. There is no need to use send queues.
//
const ServerDebugger = function(d_name, wd_list, mdebugger_ws) {
   this.mdebugger_ws = mdebugger_ws;
   this.view_ws_list = [];
   this.wd_list = wd_list;
   this.name = d_name;

   this.watchpoint_expr = "";
   this.watchpoint_state = dcommon.WATCHPOINT_DISABLE;

   this.stepper = false;
   this.stepper_remains = 0;
   this.stepper_steps = 0;

   this.recv_md_seq = 1;
   this.recv_md_queue = [];
   this.send_md_seq = 0;

   let stepper_infos = () => {
      if (this.stepper)
	 return { steps: this.stepper_steps,
		  remains: this.stepper_remains }
      return false;
   };

   let watchpoint_infos = () => {
      return { expr: this.watchpoint_expr,
	       state: this.watchpoint_state }
   };

   this.hopjs_svc_list = wd_list.map((wd, idx, arr) => {
      return new Service(() => _window_viewer(d_name, wd_list[idx],
					      stepper_infos(),
					      watchpoint_infos()),
   			 dcommon.svc_url(d_name, idx));
   });
   this.hopjs_svc_entrypoint =
      new Service(() => _window_viewer(d_name, wd_list[0], stepper_infos(),
				       watchpoint_infos()),
		  d_name);
}

ServerDebugger.prototype.send_md = function(msg) {
   let md = this.mdebugger_ws;
   let state = md.readyState;

   //
   // Hop.js WebSocketServer does not support state constants
   //
   if (state != 1) {
      console.log("Hiphop.js debugger server: MachineDebugger WS not open. " +
		  "Disable debugger " + this.name + ".");
      this.disable();
   } else if (!msg) {
      console.log("Hiphop.js debugger server: can't send machine debugger " +
		  "empty message. Bug?");
   } else {
      msg.seq = ++this.send_md_seq;
      msg = JSON.stringify(msg);
      md.send(msg);
   }
}

ServerDebugger.prototype.recv_md = function(msg) {
   let apply_msg = msg => {
      this.recv_md_seq++;
      switch (msg.type) {
      case dcommon.DEBUGGER_UPDATE:
	 this.update(msg.diff_list);
	 break;
      case dcommon.DEBUGGER_DISABLED:
	 this.disable();
	 break;
      case dcommon.STEPPER_ENABLE:
	 this.stepper_enable();
	 break;
      case dcommon.STEPPER_DISABLE:
	 this.stepper_disable();
	 break;
      case dcommon.STEPPER_UPDATE:
	 this.stepper_remains = msg.remains;
	 this.stepper_steps = msg.steps;
	 this.stepper_update();
	 break;
      case dcommon.WATCHPOINT_REACHED:
	 this.stepper_enable(true);
	 this.watchpoint_state = dcommon.WATCHPOINT_REACHED;
	 this.broadcast_view({ type: dcommon.WATCHPOINT_REACHED,
			       remains: this.stepper_remains,
			       steps: this.stepper_steps });
	 break;
      case dcommon.WATCHPOINT_INVALID:
	 this.watchpoint_state = dcommon.WATCHPOINT_INVALID;
	 this.broadcast_view({ type: dcommon.WATCHPOINT_INVALID });
	 break;
      }
   }

   if (msg.seq <= this.recv_md_seq) {
      console.log("Hiphop.js debugger server: receive machine debugger " +
		  "message with invalid seq [1]. Bug?");
   } else if (msg.seq > this.recv_md_seq + 1) {
      dcommon.insert_sort(this.recv_md_queue, msg);
   } else if (msg.seq == this.recv_md_seq + 1) {
      apply_msg(msg);
   } else {
      console.log("Hiphop.js debugger server: receive machine debugger " +
		  "message with invalid seq [2]. Bug?");
   }

   this.recv_md_queue.forEach((msg, i, q) => {
      if (msg.seq == this.recv_seq + 1) {
	 q.splice(i, 1);
	 apply_msg(msg);
      }
   })
};

ServerDebugger.prototype.send_view = function(view_ws, msg) {
   let state = view_ws.readyState;

   //
   // Hop.js WebSocketServer does not support state constants
   //
   if (state != 1) {
      view_ws.close();
      this.view_ws_list.splice(this.view_ws_list.indexOf(view_ws), 1);
   } else if (!msg) {
      console.log("Hiphop.js debugger server: can't send viewer empty " +
		  "message. Bug?");
   } else {
      msg.seq = ++view_ws.send_seq;
      msg = JSON.stringify(msg);
      try {
	 view_ws.send(msg);
      } catch (e) {
	 console.log('BUG DEBUG');
      }
   }
}

ServerDebugger.prototype.broadcast_view = function(msg, module_instance_id=-1) {
   if (module_instance_id == -1)
      this.view_ws_list.forEach(view_ws => this.send_view(view_ws, msg));
   else
      this.view_ws_list.forEach(view_ws => {
	 if (view_ws.module_instance_id == module_instance_id) {
	    this.send_view(view_ws, msg);
	 }
      });
}

ServerDebugger.prototype.recv_view = function(view_ws, msg) {
   let apply_msg = msg => {
      view_ws.recv_seq++;
      switch(msg.type) {
      case dcommon.VIEW_HELLO:
	 this.view_ws_list.push(view_ws);
	 break;
      case dcommon.STEPPER_NEXT:
	 this.stepper_next(msg.steps);
	 break;
      case dcommon.STEPPER_ENABLE:
	 this.stepper_enable();
	 break;
      case dcommon.STEPPER_DISABLE:
	 this.stepper_disable();
	 break;
      case dcommon.WATCHPOINT_ENABLE:
	 this.watchpoint_expr = msg.watchpoint_expr;
	 this.watchpoint_state = dcommon.WATCHPOINT_ENABLE;
	 this.send_md({ type: dcommon.WATCHPOINT_ENABLE,
			watchpoint_expr: this.watchpoint_expr });
	 this.broadcast_view({ type: dcommon.WATCHPOINT_ENABLE,
			       watchpoint_expr: this.watchpoint_expr });
	 break;
      case dcommon.WATCHPOINT_DISABLE:
	 this.watchpoint_expr = "";
	 this.watchpoint_state = dcommon.WATCHPOINT_DISABLE;
	 this.send_md({ type: dcommon.WATCHPOINT_DISABLE });
	 this.broadcast_view({ type: dcommon.WATCHPOINT_DISABLE });
	 break;
      }
   }

   if (msg.seq <= view_ws.recv_seq) {
      console.log("Hiphop.js debugger server: receive viewer " +
		  "message with invalid seq [1]. Bug?");
   } else if (msg.seq > view_ws.recv_seq + 1) {
      dcommon.insert_sort(view_ws.recv_queue, msg);
   } else if (msg.seq == view_ws.recv_seq + 1) {
      apply_msg(msg);
   } else {
      console.log("Hiphop.js debugger server: receive viewer " +
		  "message with invalid seq [2]. Bug?");
   }

   view_ws.recv_queue.forEach((msg, i, q) => {
      if (msg.seq == view_ws.recv_seq + 1) {
	 q.splice(i, 1);
	 apply_msg(msg);
      }
   })
}

ServerDebugger.prototype.disable = function() {
   delete sdebugger_map[this.name];
   this.hopjs_svc_list.forEach((svc, idx, arr) => svc.unregister());
   this.hopjs_svc_entrypoint.unregister();
   this.view_ws_list.forEach(view => view.close());
}

ServerDebugger.prototype.update = function(diff_list) {
   diff_list.forEach((diff, i, arr) => {
      let instr_list = this.wd_list[i].instruction_list;

      this.broadcast_view({ type: dcommon.DEBUGGER_UPDATE, diff: diff }, i);
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

	    if (change.signal_value)
	       w.signal_value = change.signal_value;
      	 } else {
      	    throw new error.InternalError("Applying diff.", null);
      	 }
      });
   });
}

ServerDebugger.prototype.stepper_next = function(steps) {
   this.send_md({ type: dcommon.STEPPER_NEXT,
		  steps: steps });
   this.stepper_update();
}

ServerDebugger.prototype.stepper_enable = function(watchpoint=false) {
   if (this.stepper)
      return;
   this.stepper = true;
   this.stepper_remains = 0;
   this.stepper_steps = 0;

   if (!watchpoint) {
      this.send_md({ type: dcommon.STEPPER_ENABLE });
      this.broadcast_view({ type: dcommon.STEPPER_ENABLE,
			    remains: this.stepper_remains,
			    steps: this.stepper_steps });
   }
}

ServerDebugger.prototype.stepper_disable = function() {
   if (!this.stepper)
      return;
   this.stepper = false;
   this.send_md({ type: dcommon.STEPPER_DISABLE });
   this.broadcast_view({ type: dcommon.STEPPER_DISABLE });
}

ServerDebugger.prototype.stepper_update = function() {
   this.broadcast_view({ type: dcommon.STEPPER_UPDATE,
			 remains: this.stepper_remains,
			 steps: this.stepper_steps });
}

//
// WebSocketServer handling communication between reactive machine
// debugger and server debugger.
//

// Hack to avoid service redefinition if HH is loaded by several Hop threads.
// Todo: split preprocessor in a separate module that could be loaded several times.

if (!Service.exists(dcommon.SDEBUGGER_WS)) {
  let sdebugger_ws = new WebSocketServer(dcommon.SDEBUGGER_WS);

  sdebugger_ws.onconnection = function(evt) {
    let mdebugger_ws = evt.value;

    mdebugger_ws.onmessage = function(evt) {
      let msg = dcommon.parse_data(evt);

      if (!msg) {
	console.log("Hiphop.js debugger server: receive machine debugger " +
		    "empty message. Bug?");
	return;
      }

      let sd = sdebugger_map[msg.d_name];

      if (msg.type == dcommon.DEBUGGER_ENABLE) {
	if (sd) {
	  //
	  // Hop.js WebSocketServer does not support state constants
	  //
	  if (sd.mdebugger_ws.readyState == 1) {
	    //
	    // Don't send any message if the connection is already
	    // closed. (at this time, it can't be connecting)
	    //
	    sd.send_md({ type: dcommon.DEBUGGER_OVERRIDEN });
	  }
	  sd.disable();
	}
	sdebugger_map[msg.d_name] = new ServerDebugger(msg.d_name,
						       msg.wd_list,
						       mdebugger_ws);
      } else if (sd) {
	sd.recv_md(msg);
      }
    }

    mdebugger_ws.onclose = function(evt) {
      for (let d_name in sdebugger_map) {
   	let sd = sdebugger_map[d_name];

   	if (sd.mdebugger_ws == mdebugger_ws)
	  sd.disable();
      }
    }
  }
}

//
// WebSocketSever handling communication between viewers client and
// server.
//

// Hack to avoid service redefinition if HH is loaded by several Hop threads.
// Todo: split preprocessor in a separate module that could be loaded several times.

if (!Service.exists(dcommon.VIEWER_WS)) {
  let sviewer_ws = new WebSocketServer(dcommon.VIEWER_WS);

  sviewer_ws.onconnection = function(evt) {
    let view_ws = evt.value;
    let sd;

    view_ws.recv_queue = [];
    view_ws.send_seq = 0;
    view_ws.recv_seq = 0;
    view_ws.onmessage = function(evt) {
      let msg = dcommon.parse_data(evt);

      if (!msg) {
	console.log("Hiphop.js debugger server: receive viewer empty " +
		    "message. Bug?");
	return;
      }

      if (!sd) {
	sd = sdebugger_map[msg.d_name];
	if (!sd)
	  return;
      }
      view_ws.module_instance_id = msg.module_instance_id;
      sd.recv_view(view_ws, msg);
    }

    view_ws.onclose = function(evt) {
      if (sd) {
	let i = sd.view_ws_list.indexOf(view_ws);

	if (i > -1)
	  sd.view_ws_list.splice(i, 1);
      }
    }
  }
}
