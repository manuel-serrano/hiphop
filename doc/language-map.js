"use hopscript"

const markdown = require("markdown");
const doc = require("hopdoc");

var cur_indent = 0;

function children(args) {
   return Array.prototype.slice.call(args, 1, args.length);
}

function header(label, symbol=null) {
   const ret =
	   <tr class="warning">
	     <td colspan=2 align=center>
	       <strong>${label}</strong>
	       ${(function() {
		  if (symbol)
		     return <span>
		       <em style="font-size:140%;margin-left:2%">
                          ${symbol}
		       </em> ::=
		     </span>
	       })()}
	     </td>
	   </tr>
   return ret;
}

function INDENT() {
   let ret;

   cur_indent += 5;
   ret = <div style=${"margin-left:" + cur_indent + "%"}>
     ${children(arguments)}
   </div>
   cur_indent -= 5;

   return ret;
}

function TERM_NODE(attrs) {
   return <span>
     <strong>&lt;${attrs.name}&gt;</strong>
     ${(function() {if (attrs.br) return <br/>})()}
     ${children(arguments)}
     ${(function() {if (attrs.br) return <br/>})()}
     <strong>&lt;/${attrs.name}&gt;</strong>
   </span>;
}

function TERM(attrs) {
   return <span>
     ${attrs.name}
     ${(function() {if (attrs.br) return <br/>})()}
   </span>
}

function NTERM(attrs) {
   return <em style=${"font-size:140%;"}>
     ${attrs.name}
     ${(function() {if (attrs.br) return <br/>})()}
   </em>
}

function OPT(attrs) {
   return <span>
     [ ${children(arguments)} ]
     ${(function() {if (attrs.br) return <br/>})()}
   </span>;
}

exports.langage_map =
   <table class="table table-striped table-hover">
     ${header("Conventions")}
     ${header("Statements", "stat")}
     ${header("Expressions")}
     ${header("Interface")}
     ${header("Module")}
     <tr>
       <td>
	 <term_node name="Module">
	   <indent>
	     <opt br>
	       <nterm name="module-header"/>
	     </opt>
	     <nterm name="stmt"/>
	   </indent>
	 </term_node>
       </td>
       <td>
	 Entry point of a reactive program.
       </td>
     </tr>
   </table>
