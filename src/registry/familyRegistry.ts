import fs from "node:fs";
import path from "node:path";
import type { ArtifactFamily, BuiltinArtifactFamily, RenderKind } from "../types.js";

export interface FamilyDefinition {
  name: ArtifactFamily;
  builtin: boolean;
  renderKinds: RenderKind[];
  extensionPath?: string;
}

const BUILTIN_FAMILIES: BuiltinArtifactFamily[] = [
  "instructions",
  "rules",
  "skills",
  "hooks",
  "agents",
  "commands"
];

const registry = new Map<ArtifactFamily, FamilyDefinition>();

export function registerFamily(definition: FamilyDefinition): void {
  if (!/^[a-z][a-z0-9-]*$/.test(definition.name)) {
    throw new Error(`Invalid artifact family name: ${definition.name}`);
  }
  if (registry.has(definition.name)) {
    throw new Error(`Artifact family already registered: ${definition.name}`);
  }
  registry.set(definition.name, definition);
}

export function registerBuiltinFamilies(): void {
  for (const name of BUILTIN_FAMILIES) {
    if (!registry.has(name)) {
      registry.set(name, { name, builtin: true, renderKinds: [] });
    }
  }
}

export function resetFamilyRegistry(): void {
  registry.clear();
}

export function getFamily(name: string): FamilyDefinition | undefined {
  return registry.get(name);
}

export function registeredFamilies(): FamilyDefinition[] {
  return [...registry.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function parseManifest(content: string, manifestPath: string): { artifactFamily: string; targets: string[] } {
  const values = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const match = /^([a-z_]+):\s*(.+?)\s*$/.exec(line.trim());
    if (match) {
      values.set(match[1]!, match[2]!.replace(/^['"]|['"]$/g, ""));
    }
  }

  const artifactFamily = values.get("artifact_family");
  if (!artifactFamily) {
    throw new Error(`Extension manifest ${manifestPath} is missing artifact_family`);
  }
  const targetsValue = values.get("targets") ?? "";
  const targets = targetsValue.replace(/^\[|\]$/g, "").split(",").map((value) => value.trim()).filter(Boolean);
  return { artifactFamily, targets };
}

/** Discover target-local extension families without executing extension code. */
export function discoverExtensionFamilies(targetRoot: string): FamilyDefinition[] {
  const extensionsPath = path.join(targetRoot, ".agent-harness", "extensions");
  if (!fs.existsSync(extensionsPath)) {
    return [];
  }

  const discovered: FamilyDefinition[] = [];
  for (const entry of fs.readdirSync(extensionsPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(extensionsPath, entry.name, "manifest.yaml");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = parseManifest(fs.readFileSync(manifestPath, "utf-8"), manifestPath);
    if (registry.has(manifest.artifactFamily)) {
      throw new Error(`Extension manifest ${manifestPath} registers duplicate family ${manifest.artifactFamily}`);
    }
    const definition: FamilyDefinition = {
      name: manifest.artifactFamily,
      builtin: false,
      renderKinds: [],
      extensionPath: path.dirname(manifestPath)
    };
    registerFamily(definition);
    discovered.push(definition);
  }
  return discovered;
}
