import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";

const host = "localhost";
const port = 8888;

const contents = {
   "/abro.mjs": readFileSync("./abro.mjs"),
   "/": readFileSync("./index.html"),
   "/hiphop.mjs": readFileSync("./node_modules/@hop/hiphop/hiphop-client.mjs")
}

for (let file of readdirSync("./node_modules/@hop/hiphop/lib")) {
   if (file.match(/\.m?js$/)) {
      contents["/lib/" + file] = readFileSync("./node_modules/@hop/hiphop/lib/" + file);
   }
}

const handler = function(req, res) {
   const content = contents[req.url];

   if (content) {
      if (req.url.match(/\.m?js$/)) {
	 res.setHeader("Content-Type", "text/javascript");
      } else {
	 res.setHeader("Content-Type", "text/html");
      }

      res.writeHead(200);
      res.end(content);
   } else {
      res.writeHead(404);
      res.end("no such file");
   }
}

const server = createServer(handler);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
