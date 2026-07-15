import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadJsonSchema(): object {
  const schemaPath = path.join(__dirname, "../../..", "archetypes", "org-config.schema.json");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  return JSON.parse(schemaContent);
}
