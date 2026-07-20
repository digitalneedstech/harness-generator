import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface UpgradePlan {
  supported: boolean;
  command?: string;
  args?: string[];
  reason?: string;
}

export function buildUpgradePlan(tag = "latest"): UpgradePlan {
  if (process.env.npm_execpath || process.env.npm_lifecycle_event) {
    return { supported: false, reason: "Self-upgrade is unavailable from an npm script or npx/local invocation. Upgrade the package through npm instead." };
  }
  const launcherPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
  const sourceCheckout = launcherPath && fs.existsSync(path.join(path.dirname(launcherPath), "..", "src", "index.ts"));
  if (sourceCheckout) {
    return { supported: false, reason: "Self-upgrade is unavailable from a source checkout. Pull and rebuild the checkout instead." };
  }
  return { supported: true, command: "npm", args: ["install", "--global", `agent-harness-cli@${tag}`] };
}

export async function runUpgrade(plan: UpgradePlan, timeoutSeconds = Number(process.env.SELF_UPGRADE_TIMEOUT_SECS ?? "120")): Promise<void> {
  if (!plan.supported || !plan.command || !plan.args) throw new Error(plan.reason ?? "Self-upgrade is not supported in this environment.");
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) throw new Error("SELF_UPGRADE_TIMEOUT_SECS must be a positive number.");
  await execFileAsync(plan.command, plan.args, { timeout: timeoutSeconds * 1000 });
}
