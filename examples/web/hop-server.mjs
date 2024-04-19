import { readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import * as hop from "@hop/hop";
import { index } from "./index.mjs";

const hopConfig = {
   ports: { http: 8888 },
   users: [ {name: "anonymous", services: "*", directories: "*"} ]
};

hop.init(hopConfig);

const cwd = dirname(import.meta.url.toString().replace(/^file:\/\//, ""));
const R = new hop.Resolver(cwd);

const rootSvc = hop.Service(index(R), "/");

hop.listen().then(v => console.log(`Server is running on http://${rootSvc()}`));
