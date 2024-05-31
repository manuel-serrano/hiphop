export function index(R) {
   return (o) => <html>
      <script type="importmap"> {
	 "imports": {
            "@hop/hiphop": "${R.url('./node_modules/@hop/hiphop/hiphop-client.mjs')}"
         }
      }
      </script>
      <script type="module">
         import { mach } from ${R.url("./abro.mjs")};
         globalThis.mach = mach;
         mach.addEventListener("O", (evt) => {
            document.getElementById("console").innerHTML = evt.nowval;
         });
         mach.react();
      </script>
      <div>
         <button onclick=~{mach.react({A: 1})}>A</button>
         <button onclick=~{mach.react({B: 1})}>B</button>
         <button onclick=~{mach.react({R: 1})}>R</button>
      </div>
      <div id="console">-</div>
   </html>
}
