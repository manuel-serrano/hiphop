function must_be_implemented(context) {
   throw "Runtime error: must be implemented! " + context.constructor.name;
}

function Signal(name, value, scope_lvl) {
   /* value == false: pure signal
      value != false: valued signal */

   this.name = name;
   this.set = false;
   this.value = value == undefined ? false : value;
}

/* A wire connect two statements.
   Example: the GO wire of suspend to GO wire of pause.
   The `state` attribute, contains the status (set or unset) of the wire */

function Wire(input, output) {
   this.input = input;
   this.output = output;
   this.state = false;
}

/* Root class of any kernel statement. Attributes prefixed by `w_` are
   wire that connect it to other statements. */

function Statement() {
   this.w_go = null;
   this.w_res = null;
   this.w_susp = null;
   this.w_kill = null;
   this.w_sel = null;

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.w_k = [null, null];
}

/* Get the mask telling which wire are on on a begining of a tick.
   Note that only "inputs" wires are needed here. */

Statement.prototype.get_config = function(incarnation_lvl) {
   var mask = 0;

   mask |= this.w_go != null ? w_go.state : 0;
   mask |= this.w_res != null ? w_res.state : 0;
   mask |= this.w_susp != null ? w_susp.state : 0;
   mask |= this.w_kill != null ? w_kill.state : 0;

   return mask;
}

Statement.prototype.run = function() {
   must_be_implemented(this);
}

function EmitStatement(signal) {
   Statement.call(this);
   this.signal = null;
}

EmitStatement.prototype = new Statement();

EmitStatement.prototype.run() {
}

function PauseStatement() {
   Statement.call(this);
   this.reg = false;
}

PauseStatement.prototype = new Statement()

PauseStatement.prototype.run(incarnation_lvl) {
   if (this.w_res && this.reg) {
      this.reg = false;
      this.w_k[0].out.run();
   } else {
      this.reg = true;
      this.w_k[1].out.run();
   }
}

exports.Signal = Signal;
exports.EmitStatement = EmitStatement;
exports.PauseStatement = PauseStatement;
