"use hopscript"

const dsymb = require("./debugger-symbols.js");

//
// Hop.js server only code.
//
let tr = require(hop.tree);

//
// Map active debugger name to its ServerDebugger object.
//
let debugger_map = {};

//
// Generic viewer function
//
const _window_viewer = function(d_name, wd) {
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

   return <html>
     <head css=${tr.css} jscript=${tr.jscript}>
   	  ~{
   	     var code;
   	     var wd = ${wd};
   	     var seq = 0;
   	     var program_tree_expanded = true;
	     var pt_clicks_handlers = [];
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

   		if (value.type == ${dsymb.DEBUGGER_UPDATE} && seq < value.seq) {
   		   seq = value.seq;
   		   update_wd(value.diff);
   		} else if (value.type == ${dsymb.DEBUGGER_DISABLE}) {
   		   debugger_disabled();
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

   	     window.onload = function() {
   		code = new hop.reactProxy({value: ""});
   		write_code();
		mk_pt_clicks_handlers(wd.program_tree);
   		server.addEventListener(
   		   ${dsymb.svc_url(d_name, wd.module_instance_id)},
		   handle_event);
   	     }
   	  }
     </head>
     <style>
       tr.hop-tree-row-selected {
	  background: inherit;
       }
     </style>
     <body style="font-family:mono;">
       <div id="program-tree-container" style="float:left; width:20%;">
   	 <div id="program-tree-title">Program tree</div>
   	 <button id="toogle-program-tree"
   		 onclick=~{toogle_program_tree()}>Collapse tree</button>
   	      ${print_program_tree(wd.program_tree)}
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
const ServerDebugger = function(d_name, wd_list, ws_client) {
   this.ws_client = ws_client;
   this.wd_list = wd_list;
   this.seq = 0;
   this.name = d_name;
   this.hopjs_svc_list = wd_list.map(function(wd, idx, arr) {
      return new Service(() => _window_viewer(d_name, wd_list[idx]),
   			 dsymb.svc_url(d_name, idx));
   });
   this.hopjs_svc_entrypoint =
      new Service(() => _window_viewer(d_name, wd_list[0]), d_name);
}

ServerDebugger.prototype.disable = function() {
   this.hopjs_svc_list.forEach((svc, idx, arr) => svc.unregister());
   this.hopjs_svc_entrypoint.unregister();
}

ServerDebugger.prototype.update = function(diff_list, seq) {
   this.seq = seq;
   diff_list.forEach((diff, i, arr) => {
      let instr_list = this.wd_list[i].instruction_list;

      hop.broadcast(dsymb.svc_url(this.name, i),
   		    { type:dsymb.DEBUGGER_UPDATE, seq: seq, diff: diff });
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

//
// WebSocketServer handling communication between reactive machine
// debugger which lives on client, and server part of the
//
let ws_server = new WebSocketServer(dsymb.DEBUGGER_WS);

ws_server.onconnection = function(evt) {
   let ws_client = evt.value;

   ws_client.onmessage = function(evt) {
      //
      // TODO: there is probably a wiser thing to do here.
      //
      let data = null;
      try {
	 data = JSON.parse(evt.data);
      } catch (e) {
	 data = null;
      }
      if (!data)
	 return;

      if (data.type == dsymb.DEBUGGER_ENABLE) {
   	 enable_debugger(data.d_name, data.wd_list, ws_client);
      } else if (data.type == dsymb.DEBUGGER_UPDATE) {
   	 update_debugger(data.d_name, data.seq, data.diff_list);
      } else if (data.type == dsymb.DEBUGGER_DISABLED) {
   	 disable_debugger(data.d_name);
      }
   }

   ws_client.onclose = function(evt) {
      for (let d_name in debugger_map) {
   	 let d = debugger_map[d_name];

   	 if (d.ws_client == ws_client)
   	    disable_debugger(d_name);
      }
   }
}

const update_debugger = function(d_name, seq, diff_list) {
   let d = debugger_map[d_name];

   if (d) {
      if (d.seq >= seq)
   	 return;
      d.update(diff_list, seq);
   }
};
exports.update_debugger = update_debugger;

//
// client_ws is null if the reactive machine part of the debugger
// lives on the server.
//
const enable_debugger = function(d_name, wd_list, ws_client=null) {
   let d = debugger_map[d_name];
   if (d)
      d.disable();

   debugger_map[d_name] = new ServerDebugger(d_name, wd_list, ws_client);
};
exports.enable_debugger = enable_debugger;

const disable_debugger = function(d_name) {
   let d = debugger_map[d_name];

   if (d) {
      d.disable();
      delete debugger_map[d_name];
   }
};
exports.disable_debugger = disable_debugger;
