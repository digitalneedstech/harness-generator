import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { analyzeRepository } from "../analyzer.js";
import { loadBaseline, resolveBaselinePath } from "../audit/baseline.js";
import { computeAuditDiff } from "../audit/diff.js";
import { loadOrgConfigIfExists } from "../orgconfig/loader.js";
import { computeScore, parseScoreWeights } from "./compute.js";

function render(result: ReturnType<typeof computeScore>, format: string): string {
  if (format === "json") return `${JSON.stringify(result, null, 2)}\n`;
  if (format !== "text") throw new Error(`Unsupported score format: ${format}. Supported formats: text, json`);
  return ["HARNESS MATURITY SCORE", `Overall: ${result.overall}/100`, `Coverage: ${result.coverage}/100`, `Drift penalty: ${result.driftPenalty}/100`, `Policy coverage: ${result.policyCoverage}/100`].join("\n") + "\n";
}

export function buildScoreCommand(): Command {
  return new Command("score")
    .description("Calculate a repository harness maturity score")
    .option("-t, --target <path>", "Target repository path", process.cwd())
    .option("--org-config <path>", "Optional organization configuration")
    .option("--weights <weights>", "coverage=0.4,drift=0.35,policy=0.25")
    .option("--format <type>", "Report format: text, json", "text")
    .option("--report <path>", "Write report to a path")
    .option("--min-score <score>", "Fail when score is below this value")
    .action(async (options) => {
      const scan = await analyzeRepository(options.target);
      const baseline = loadBaseline(resolveBaselinePath(options.target));
      const audit = baseline ? computeAuditDiff(baseline, scan.files, scan.clusters).summary : null;
      const orgConfig = options.orgConfig ? loadOrgConfigIfExists(options.orgConfig) : null;
      const result = computeScore(scan.clusters.map((cluster) => cluster.name), baseline, audit, orgConfig, parseScoreWeights(options.weights));
      const output = render(result, options.format);
      if (options.report) {
        fs.writeFileSync(options.report, output);
      } else {
        const scorePath = path.join(options.target, ".agent-harness", "score.json");
        fs.mkdirSync(path.dirname(scorePath), { recursive: true });
        fs.writeFileSync(scorePath, `${JSON.stringify(result, null, 2)}\n`);
      }
      console.log(output);
      if (options.minScore !== undefined && result.overall < Number(options.minScore)) process.exitCode = 1;
    });
}
