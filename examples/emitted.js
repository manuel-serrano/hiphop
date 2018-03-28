require("hiphop");
const m = require("./emitted-hh.js", "hiphop");

m.emittedFunc = sigList => sigList.forEach(s => console.log(s));

m.react();
console.log('-----');
m.react();
