import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const compiledEntrypoint = path.resolve("dist/index.js");

if (!existsSync(compiledEntrypoint)) {
  console.error("dist/index.js was not found. Run `npm run build` first, or use `npm start`.");
  process.exit(1);
}

await import(pathToFileURL(compiledEntrypoint).href);