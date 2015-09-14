function Signal(name, value) {
   /* value == false: pure signal
      value != false: valued signal */

   this.name = name;
   this.set = false;
   this.value = value == undefined ? false : value;
}

/* A wire connect two statements.
   Example: the GO wire of suspend to GO wire of pause.
   The `state` array, indexed by incarnation level, contains the status
   (set or unset) of the wire */

function Wire(input, output) {
   this.input = input;
   this.output = output;
   this.state = [ false ]
}

/* Root class of any kernel statement. Attributes prefixed by `w_` are
   wire that connect it to other statements. They can be a list, since a
   wire can by divided into two branchs (eg. the GO wire of `pause`) */

function Statement() {
   this.w_go = null;
   this.w_res = null;
   this.w_susp = null;
   this.w_kill = null;
   this.w_sel = null;

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.w_k = [null, null];
}

function EmitStatement(signal) {
   Statement.call(this);
   this.signal = null;
}

EmitStatement.prototype.baseClass = new Statement();

function PauseStatement() {
   Statement.call(this);
}

PauseStatement.prototype.baseClass = new Statement()

exports.Signal = Signal;
exports.EmitStatement = EmitStatement;
exports.PauseStatement = PauseStatement;
