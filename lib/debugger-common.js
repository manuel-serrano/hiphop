exports.DEBUGGER_WS = "hiphopWSDebugger";
exports.VIEWER_WS = "hiphopWSViewer"
exports.DEBUGGER_ENABLE = "hiphopDebuggerEnable";
exports.DEBUGGER_DISABLE = "hiphopDebuggerDisable";
exports.DEBUGGER_UPDATE = "hiphopDebuggerUpdate";
exports.STEPPER_ENABLE = "hiphopStepperEnable";
exports.STEPPER_DISABLE = "hiphopStepperDisable";
exports.STEPPER_NEXT = "hiphopStepperNext";

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
