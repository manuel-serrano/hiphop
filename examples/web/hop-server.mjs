import { readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { Hop } from "@hop/hop";
import { index } from "./index.mjs";

const hopConfig = {
   ports: { http: 8888 },
   users: [ {name: "anonymous", services: "*", directories: "*"} ]
};

const hop = new Hop(hopConfig);

const cwd = dirname(import.meta.url.toString().replace(/^file:\/\//, ""));
const R = hop.Resolver(cwd);

const rootSvc = hop.Service(index(R), "/");

hop.listen().then(v => console.log(`Server is running on ${rootSvc()}`));
