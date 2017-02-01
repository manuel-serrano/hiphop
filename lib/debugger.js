"use hopscript"

const ast = require("./ast.js");
const UPDATE_EVT = "updateHHDebugger";

function update(machine) {
   if (machine._debugger) {
      hop.broadcast(UPDATE_EVT, print(machine));
   }
}
exports.update = update;

function print(machine) {
   let modules = machine.ast.dump(
      function(ast_node, args, indent) {
	 let buf = "";

	 for (let i = 0; i < indent; i++)
	       buf += "&nbsp;";

	 args.forEach(function(arg, idx, arr) {
	    buf += " ";
	    if (arg.hilight)
	       buf += "<span style='color:red'>" + arg.body + "</span>";
	    else
	       buf += arg.body;
	 });

	 buf += "<br/>";
	 return buf;
      }).modules;

   return <div>
     ${modules.map(function(module, idx, arr) {
	return <fieldset style="display: inline;">
	  <legend>MODULE${idx}</legend>
	   ${module}
	 </fieldset>
     })}
   </div>;
}

const start = function(machine, path) {
   if (process.argv.indexOf("--no-server") > -1)
      return null;

   return new Service(function () {
      let code_initial = print(machine);
      let div_initial = <div>${code_initial}</div>;

      return <html>
        ~{
	   var code = server.reactProxy(${UPDATE_EVT}, ${code_initial});
        }
	<div style="font-family:mono;">
	  ${div_initial}
	  <react>
	      ~{
		 if (code.value)
		    ${div_initial}.style.display = "none";
		 code.value;
	      }
	  </react>
	</div>
      </html>;
   }, path)
}
exports.start = start;
