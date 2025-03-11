/*=====================================================================*/
/*    .../prgm/project/hiphop/hiphop/examples/matrix/client.hh.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Jan 16 07:20:47 2016                          */
/*    Last change :  Tue Mar 11 15:54:54 2025 (serrano)                */
/*    Copyright   :  2016-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Matrix client side                                               */
/*=====================================================================*/

import { ReactiveMachine } from "@hop/hiphop";
export { animateCanvas };

/*---------------------------------------------------------------------*/
/*    pixelSize                                                        */
/*---------------------------------------------------------------------*/
const pixelSize = 20;
const maxCredit = 20;

/*---------------------------------------------------------------------*/
/*    iota ...                                                         */
/*---------------------------------------------------------------------*/
function iota(length) {
   return  Array.from({length}, (_, i) => i);
}

/*---------------------------------------------------------------------*/
/*    drawPixel ...                                                    */
/*---------------------------------------------------------------------*/
function drawPixel(canvas, x, y, val) {
   const ctx = canvas.getContext("2d");
   const px2 = pixelSize / 2;
   const k = (maxCredit - val) / maxCredit;
   const gb = Math.round(255 * k);

   ctx.fillStyle = `rgb(255,${gb},${gb})`;
   ctx.fillRect((x * pixelSize), (y * pixelSize), pixelSize, pixelSize);
}
   
/*---------------------------------------------------------------------*/
/*    animator ...                                                     */
/*---------------------------------------------------------------------*/
function animator(canvas) {
   const width = Math.round(parseInt(canvas.width) / pixelSize);
   const height = Math.round(parseInt(canvas.height) / pixelSize);
   
   const events = iota(width + 1)
      .flatMap(i => iota(height + 1)
      .map(j => `mouse-${i}-${j}`));

   const On = hiphop module() {
      in event;
      signal cnt = event.nowval.credit;
      
      exit: {
	 fork {
	    loop {
	       emit cnt(cnt.preval - 1);
	       pragma { drawPixel(canvas, event.nowval.ex, event.nowval.ey, cnt.nowval); }
	       yield;
	    }
	 } par {
	    await (cnt.nowval <= 0);
	    break exit;
	 }
      }
   }
   
   return hiphop module() {
      in ... ${events};

      fork ${events.map(e => hiphop {
	 loop {
	    await (this[e].now);
	    do {
	       run On() { ${e} as event }
	    } every (this[e].now)
	 }
      })}
   }
}

/*---------------------------------------------------------------------*/
/*    animateCanvas ...                                                */
/*---------------------------------------------------------------------*/
function animateCanvas(canvas, chrono, native) {
   const width = parseInt(canvas.width);
   const height = parseInt(canvas.height);
   const { x, y } = canvas.getBoundingClientRect();

   const prog = animator(canvas);
   const m = new ReactiveMachine(prog, { native });

   m.reactTime = function(arg) {
      const start = Date.now();
      m.react(arg);
      const stop = Date.now();

      chrono.innerHTML = (stop - start) + "ms";
   }
   
   const ctx = canvas.getContext("2d");
   ctx.fillStyle = "#fff";
   ctx.fillRect(0, 0, canvas.width, canvas.height);

   canvas.addEventListener("mousemove", e => {
      const { clientX, clientY } = e;
      if (clientX > x && clientX < (x + width)
	 &&
	 clientY > y && clientY < (y + height)) {
	 const ex = Math.round((clientX - x) / pixelSize);
	 const ey = Math.round((clientY - y) / pixelSize);
	 const me = `mouse-${ex}-${ey}`;
	 
	 m.reactTime({[me]: {ex, ey, credit: maxCredit}});
      }
   });

   setInterval(() => m.reactTime({}), 200);
}

