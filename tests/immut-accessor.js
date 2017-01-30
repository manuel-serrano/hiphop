"use hopscript"

const hh = require("hiphop");


<hh.module O>
  <hh.atom apply=${function() {
     this.value.Oi== 5;
  }}/>
</hh.module>

<hh.module O>
  <hh.atom apply=${function() {
     this.value.Oi   == 5;
  }}/>
</hh.module>

try {
   <hh.module O>
     <hh.atom apply=${function() {
	this.value.Oi= 5;
     }}/>
   </hh.module>
} catch (e) {
   console.log(1, e.message);
}

try {
   <hh.module O>
     <hh.atom apply=${function() {
	this.value.Oi = 5;
     }}/>
   </hh.module>
} catch (e) {
   console.log(2, e.message);
}


try {
   <hh.module O>
     <hh.atom apply=${function() {
	this.value.Oi                        = 5;
     }}/>
   </hh.module>
} catch (e) {
   console.log(3, e.message);
}
