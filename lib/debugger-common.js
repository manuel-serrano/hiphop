exports.SDEBUGGER_WS = "hiphopWSSDebugger";
exports.VIEWER_WS = "hiphopWSViewer"
exports.VIEW_HELLO = "hiphopWSViewHello";
exports.DEBUGGER_OVERRIDEN = "hiphopDebuggerOverriden";
exports.DEBUGGER_ENABLE = "hiphopDebuggerEnable";
exports.DEBUGGER_DISABLE = "hiphopDebuggerDisable";
exports.DEBUGGER_UPDATE = "hiphopDebuggerUpdate";
exports.STEPPER_ENABLE = "hiphopStepperEnable";
exports.STEPPER_DISABLE = "hiphopStepperDisable";
exports.STEPPER_NEXT = "hiphopStepperNext";
exports.STEPPER_UPDATE = "hiphopStepperUpdate";
exports.WATCHPOINT_ENABLE = "hiphopWatchpointEnable";
exports.WATCHPOINT_DISABLE = "hiphopWatchpointDisable";
exports.WATCHPOINT_INVALID = "hiphopWatchpointInvalid";
exports.WATCHPOINT_REACHED = "hiphopWatchpointReached";

exports.svc_url = function(d_name, module_instance_id) {
   return d_name + "/module" + module_instance_id;
}

exports.parse_data = function(evt) {
   let data = null;

   try {
      data = JSON.parse(evt.data);
   } catch(e) {
      data = null;
   }

   return data;
}

exports.insert_sort = function(queue_list, msg) {
   for (let i in queue_list)
      if (queue_list[i].seq > msg.seq) {
	 queue_list.splice(i, 0, msg);
	 return;
      }
   queue_list.push(msg);
}
