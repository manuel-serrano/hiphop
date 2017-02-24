exports.DEBUGGER_WS = "hiphopDebugger";
exports.DEBUGGER_ENABLE = "hiphopDebuggerEnable";
exports.DEBUGGER_DISABLE = "hiphopDebuggerDisable";
exports.DEBUGGER_UPDATE = "hiphopDebuggerUpdate";

exports.svc_url = function(d_name, module_instance_id) {
   return d_name + "/module" + module_instance_id;
}
