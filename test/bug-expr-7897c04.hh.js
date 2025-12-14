import * as hh from "@hop/hiphop";

const events = [{"g1030":26},{"g1031":83,"g1030":36}];

const prg = hiphop module() {
   inout g1031 = 0, g1030 = 0;
  if (g1030.nowval != 0) {
    ;
  } else {
    if (g1031.nowval != 0) {
      emit g1030(13);
    } else {
      ;
    }
  }
}

const opts = {"name":"default","native":false,verbose:-1};
export const mach = new hh.ReactiveMachine(prg, opts);
mach.outbuf = "";

try {
   events.forEach((e, i) => {
      mach.outbuf += (mach.name() + '[' + i + ']: '
	 + JSON.stringify(mach.reactDebug(e)) + '\n')
   });
} catch (e) {
   mach.outbuf = "causality error\n";
}
