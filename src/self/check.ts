import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface SelfCheckResult {
  currentVersion: string;
  latestVersion: string;
  upToDate: boolean;
  manifestSchemaVersion: string;
  lockFileSchemaVersion: string;
}

export async function runSelfCheck(packageName = "agent-harness-cli", currentVersion?: string): Promise<SelfCheckResult> {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const packagePath = path.resolve(moduleDirectory, "../../package.json");
  const packageVersion = currentVersion ?? JSON.parse(fs.readFileSync(packagePath, "utf-8")).version as string;
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
  if (!response.ok) throw new Error(`Unable to read npm registry metadata for ${packageName}: ${response.status}`);
  const metadata = await response.json() as { version?: string };
  if (!metadata.version) throw new Error(`npm registry returned no latest version for ${packageName}`);
  return { currentVersion: packageVersion, latestVersion: metadata.version, upToDate: packageVersion === metadata.version, manifestSchemaVersion: "1", lockFileSchemaVersion: "1" };
}
