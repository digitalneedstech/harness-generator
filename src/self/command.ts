import { Command } from "commander";
import { runSelfCheck } from "./check.js";
import { buildUpgradePlan, runUpgrade } from "./upgrade.js";

export function buildSelfCommand(): Command {
  const command = new Command("self").description("Check or update the harness-gen CLI");
  command.command("check")
    .description("Check the installed CLI against the npm registry")
    .option("--format <type>", "Output format: text, json", "text")
    .option("--fail-if-outdated", "Exit non-zero when an update is available", false)
    .action(async (options) => {
      const result = await runSelfCheck();
      console.log(options.format === "json" ? JSON.stringify(result, null, 2) : `Current: ${result.currentVersion}\nLatest: ${result.latestVersion}\n${result.upToDate ? "Up to date." : "Update available."}`);
      if (options.failIfOutdated && !result.upToDate) process.exitCode = 1;
    });
  command.command("upgrade")
    .description("Upgrade the globally installed CLI")
    .option("--tag <version>", "npm tag or released version", "latest")
    .option("--dry-run", "Show the installer command without running it", false)
    .action(async (options) => {
      const plan = buildUpgradePlan(options.tag);
      if (!plan.supported) throw new Error(plan.reason);
      console.log(`${plan.command} ${plan.args!.join(" ")}`);
      if (!options.dryRun) await runUpgrade(plan);
    });
  return command;
}
