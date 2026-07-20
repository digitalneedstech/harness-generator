import fs from "node:fs";
import { Command } from "commander";
import { analyzeRepository } from "../analyzer.js";
import { loadBaseline, resolveBaselinePath } from "../audit/baseline.js";
import { loadOrgConfigIfExists } from "../orgconfig/loader.js";
import { discoverExtensionFamilies, registerBuiltinFamilies, resetFamilyRegistry } from "../registry/familyRegistry.js";
import { validateArtifacts } from "./checks.js";

export function buildValidateCommand(): Command {
  return new Command("validate")
    .description("Validate cross-artifact consistency")
    .option("-t, --target <path>", "Target repository path", process.cwd())
    .option("--org-config <path>", "Optional organization configuration")
    .option("--format <type>", "Report format: text, json", "text")
    .option("--report <path>", "Write report to a path")
    .option("--fail-on-warning", "Exit non-zero when warnings are present", false)
    .action(async (options) => {
      if (options.format !== "text" && options.format !== "json") {
        throw new Error(`Unsupported validation format: ${options.format}. Supported formats: text, json`);
      }
      resetFamilyRegistry();
      registerBuiltinFamilies();
      discoverExtensionFamilies(options.target);
      const scan = await analyzeRepository(options.target);
      const result = validateArtifacts(options.target, scan, loadBaseline(resolveBaselinePath(options.target)), options.orgConfig ? loadOrgConfigIfExists(options.orgConfig) : null);
      const output = options.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : ["HARNESS VALIDATION", ...result.findings.map((finding) => `${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`), result.findings.length === 0 ? "No consistency findings." : ""].filter(Boolean).join("\n") + "\n";
      if (options.report) fs.writeFileSync(options.report, output);
      console.log(output);
      if (!result.valid || (options.failOnWarning && result.findings.length > 0)) process.exitCode = 1;
    });
}
