import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ArchetypeManifest } from "./registry.js";
import type { ArchetypeTarget } from "./mapper.js";
import { mapArtifact } from "./mapper.js";
import type { ProjectSignals } from "./scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHETYPES_DIR = path.resolve(__dirname, "../../archetypes");

export interface WriteResult {
  relativePath: string;
  skipped: boolean;
}

function applySubstitutions(content: string, signals: ProjectSignals, stackLabel: string): string {
  return content
    .replace(/\{\{project_name\}\}/g, signals.projectName)
    .replace(/\{\{test_command\}\}/g, signals.testCommand)
    .replace(/\{\{build_command\}\}/g, signals.buildCommand)
    .replace(/\{\{stack_label\}\}/g, stackLabel);
}

function stripFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return content;
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return content;
  }
  return normalized.slice(end + 5);
}

function renderFrontmatter(metadata: Record<string, unknown>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value as unknown[]) {
        lines.push(`  - "${String(item)}"`);
      }
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: "${String(value)}"`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

export function writeArchetypeFiles(
  manifest: ArchetypeManifest,
  projectRoot: string,
  target: ArchetypeTarget,
  signals: ProjectSignals,
  dryRun: boolean,
  force: boolean
): WriteResult[] {
  const results: WriteResult[] = [];

  for (const template of manifest.templates) {
    const templatePath = path.join(ARCHETYPES_DIR, template.templatePath);
    const rawContent = fs.readFileSync(templatePath, "utf8");
    const substituted = applySubstitutions(rawContent, signals, manifest.stackLabel);

    const mapped = mapArtifact(template.family, template.slug, target);
    const absolutePath = path.join(projectRoot, mapped.relativePath);

    if (!force && fs.existsSync(absolutePath)) {
      results.push({ relativePath: mapped.relativePath, skipped: true });
      continue;
    }

    let finalContent: string;
    if (mapped.frontmatterOverride !== undefined) {
      const body = stripFrontmatter(substituted);
      finalContent = `${renderFrontmatter(mapped.frontmatterOverride)}\n\n${body.trimStart()}`;
    } else {
      finalContent = substituted;
    }

    if (!dryRun) {
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, finalContent);
    }

    results.push({ relativePath: mapped.relativePath, skipped: false });
  }

  return results;
}
