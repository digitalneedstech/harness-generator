import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const availableExtensions = new Set(["permissions", "cost-policy"]);

function copyDirectory(source: string, destination: string): void {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

export function buildExtensionCommand(): Command {
  const command = new Command("extension").description("Manage target-local harness extensions");
  command.command("add <name>")
    .option("-t, --target <path>", "Target repository path", process.cwd())
    .option("--force", "Replace an existing extension", false)
    .action((name: string, options) => {
      if (!availableExtensions.has(name)) throw new Error(`Unknown built-in extension: ${name}`);
      const source = path.resolve(__dirname, "../../extensions", name);
      const destination = path.join(options.target, ".agent-harness", "extensions", name);
      if (!fs.existsSync(source)) throw new Error(`Built-in extension package is unavailable: ${name}`);
      if (fs.existsSync(destination) && !options.force) throw new Error(`Extension already exists at ${destination}; use --force to replace it.`);
      if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
      copyDirectory(source, destination);
      console.log(`Installed ${name} in ${destination}`);
    });
  command.command("list")
    .description("List built-in extensions")
    .action(() => console.log([...availableExtensions].join("\n")));
  return command;
}
