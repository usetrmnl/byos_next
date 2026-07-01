import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./node-ts-resolve-hook.mjs", pathToFileURL("./scripts/lib/"));
