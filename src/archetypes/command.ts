import { Command } from "commander";
import * as p from "@clack/prompts";
import { resolveTargetRoot } from "../paths.js";
import { getArchetype, listArchetypes } from "./registry.js";
import { type ArchetypeTarget } from "./mapper.js";
import { scanProjectSignals } from "./scanner.js";
import { writeArchetypeWithWikis } from "./writer.js";
import { loadOrgConfigIfExists } from "../orgconfig/loader.js";

const SUPPORTED_TARGETS = new Set<ArchetypeTarget>(["claude", "copilot", "cursor"]);

function parseArchetypeTarget(value: string): ArchetypeTarget {
  if (SUPPORTED_TARGETS.has(value as ArchetypeTarget)) {
    return value as ArchetypeTarget;
  }
  throw new Error(`Unsupported target: ${value}. Supported targets: claude, copilot, cursor`);
}

interface ArchetypeOptions {
  name?: string;
  project: string;
  target: string;
  dryRun: boolean;
  force: boolean;
  list: boolean;
  orgConfig?: string;
}

export function buildArchetypeCommand(): Command {
  const cmd = new Command("archetype");

  cmd
    .description("Scaffold an SDLC workflow archetype into a target project")
    .option("--name <archetype>", "Archetype to scaffold")
    .option("--project <path>", "Target project directory", process.cwd())
    .option("--target <tool>", "Tool target: claude, copilot, cursor", "claude")
    .option("--org-config <path>", "Path to org-config.yaml (optional)")
    .option("--dry-run", "Print planned files without writing", false)
    .option("--force", "Overwrite existing files", false)
    .option("--list", "List available archetypes and exit", false)
    .action((opts: ArchetypeOptions) => {
      if (opts.list) {
        p.intro("Available archetypes");
        p.note(
          listArchetypes()
            .map((a) => `${a.name.padEnd(26)}${a.description}`)
            .join("\n"),
          "Archetypes"
        );
        p.outro("");
        return;
      }

      if (!opts.name) {
        p.cancel("--name is required. Run with --list to see available archetypes.");
        process.exit(1);
      }

      const manifest = getArchetype(opts.name);
      if (!manifest) {
        p.cancel(`Unknown archetype: ${opts.name}. Run with --list to see available archetypes.`);
        process.exit(1);
      }

      let target: ArchetypeTarget;
      try {
        target = parseArchetypeTarget(opts.target);
      } catch (error) {
        p.cancel(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }

      const projectRoot = resolveTargetRoot(opts.project);
      p.intro(`Scaffolding ${manifest.name} → ${target}`);

      const signals = scanProjectSignals(projectRoot);
      p.note(
        [
          `Project: ${signals.projectName}`,
          `Test:    ${signals.testCommand}`,
          `Build:   ${signals.buildCommand}`
        ].join("\n"),
        "Detected"
      );

      const orgConfig = opts.orgConfig ? loadOrgConfigIfExists(opts.orgConfig) : null;
      if (opts.orgConfig && !orgConfig) {
        p.cancel(`Org config not found: ${opts.orgConfig}`);
        process.exit(1);
      }

      const results = writeArchetypeWithWikis(projectRoot, manifest, target, signals, opts.dryRun, opts.force, orgConfig);

      const written = results.filter((r) => !r.skipped);
      const skipped = results.filter((r) => r.skipped);

      p.note(
        written
          .map((r) => r.relativePath)
          .sort((a, b) => a.localeCompare(b))
          .join("\n") || "(none)",
        opts.dryRun ? "Files planned" : "Files written"
      );

      if (skipped.length > 0) {
        p.note(
          skipped.map((r) => `${r.relativePath} (exists — use --force to overwrite)`).join("\n"),
          "Skipped"
        );
      }

      p.outro(opts.dryRun ? "Dry run complete." : "Archetype scaffolded.");
    });

  return cmd;
}
