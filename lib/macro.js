"use hopscript"

const hh = require("./hiphop.js");
const lang = require("./lang.js");
const error = require("./error.js");

const SUSPEND = function(attrs) {
   if (!attrs)
      attrs = {};

   let sig_list = lang.get_signal_name_list(attrs, lang.format_loc(attrs));
   let signal_name = sig_list[0];
   let loc = lang.format_loc(attrs);

   if (sig_list.length > 1)
      throw new error.SyntaxError("Suspend cannot depends of more than 1 signal.",
				  loc);

   delete attrs[signal_name];
   for (let key in attrs) {
      attrs[key.toLowerCase()] = attrs[key];
   }

   if ("until" in attrs || "untilapply" in attrs || "untilvalue" in attrs) {
      //
      // Handle the <hh.suspend S until=V/untilApply/untilValue> case
      //
      return <hh.let SUSPEND_CONTINUOUS nodebug>
	<hh.trap END_BODY nodebug>
	  <hh.parallel nodebug>

	    <hh.sequence nodebug>
	      <lang.suspend immediate SUSPEND_CONTINUOUS>
	        ${lang.expandChildren(arguments)}
	      </lang.suspend>
	      <hh.exit END_BODY  nodebug/>
	    </hh.sequence>

	    <hh.every signal=${signal_name} immediate=${attrs.immediate}
	              apply=${attrs.apply} value=${attrs.value}
	              countApply=${attrs.countapply}
		      countValue=${attrs.countvalue} nodebug>
	      <hh.abort signal=${attrs.until}
			untilApply=${attrs.untilapply}
			untilvalue=${attrs.untilvalue} nodebug>
		<hh.sustain SUSPEND_CONTINUOUS  nodebug/>
	      </hh.abort>
	    </hh.every>

          </hh.parallel>
	</hh.trap>
      </hh.let>;
   } else {
      return <lang.suspend apply=${attrs.apply} value=${attrs.value}
                           signal=${signal_name}
			   immediate=${attrs.immediate}>
         ${lang.expandChildren(arguments)}
      </lang.suspend>;
   }
}
exports.SUSPEND = SUSPEND;
