import { Command } from "commander";
import fs from "node:fs";
import * as p from "@clack/prompts";
import type { Baseline, ScanResult, AuditReport } from "../types.js";
import { analyzeRepository } from "../analyzer.js";
import { resolveBaselinePath, loadBaseline, createBaselineFromScan, writeBaseline } from "./baseline.js";
import { computeAuditDiff } from "./diff.js";
import { renderReport, type ReportFormat } from "./report.js";

export interface AuditOptions {
  target: string;
  baseline?: string;
  format: ReportFormat;
  report?: string;
  failOnDrift: boolean;
  clusterDriftThreshold: number;
  updateBaseline: boolean;
}

export async function runAudit(options: AuditOptions): Promise<number> {
  try {
    // Validate target directory
    if (!fs.existsSync(options.target) || !fs.statSync(options.target).isDirectory()) {
      p.cancel(`Target directory does not exist: ${options.target}`);
      return 2;
    }

    // Determine baseline path
    const baselinePath = resolveBaselinePath(options.target, options.baseline);

    // If update baseline mode, skip loading and just create from scan
    if (options.updateBaseline) {
      const spinner = p.spinner();
      spinner.start("Scanning repository structure...");

      const scanResult = await analyzeRepository(options.target);

      if (scanResult.files.length === 0) {
        spinner.stop("No supported source files found.");
        p.cancel("Cannot update baseline: no source files to scan.");
        return 2;
      }

      spinner.stop(`Scan complete. ${scanResult.files.length} files mapped into ${scanResult.clusters.length} clusters.`);

      // Create baseline from scan
      spinner.start("Creating baseline...");
      const baseline = createBaselineFromScan(options.target, scanResult.files, scanResult.clusters, []);
      writeBaseline(baseline, baselinePath);
      spinner.stop(`Baseline written to ${baselinePath}`);

      p.note(
        [
          `Files scanned: ${scanResult.files.length}`,
          `Clusters: ${scanResult.clusters.length}`,
          `Baseline schema: v${baseline.schemaVersion}`,
          `Checkout time: ${baseline.generatedAt}`
        ].join("\n"),
        "Baseline updated"
      );

      return 0;
    }

    // Load baseline
    const baseline = loadBaseline(baselinePath);

    if (!baseline) {
      const remediation = `Run: harness-gen audit --target ${options.target} --update-baseline`;
      p.cancel(
        `Baseline not found at ${baselinePath}\n` +
          `This is the first run or the baseline file was deleted.\n\n` +
          `To create a baseline, run:\n  ${remediation}`
      );
      return 2;
    }

    // Scan live repository
    const spinner = p.spinner();
    spinner.start("Scanning repository structure...");

    const scanResult = await analyzeRepository(options.target);

    if (scanResult.files.length === 0) {
      spinner.stop("No supported source files found.");
      p.cancel("Cannot run audit: no source files in target directory.");
      return 2;
    }

    spinner.stop(`Scan complete. ${scanResult.files.length} files mapped into ${scanResult.clusters.length} clusters.`);

    // Compute diff
    spinner.start("Computing drift...");
    const { findings, summary } = computeAuditDiff(
      baseline,
      scanResult.files,
      scanResult.clusters,
      options.clusterDriftThreshold
    );

    const report: AuditReport = {
      status: summary.blockingFindings === 0 ? "pass" : "fail",
      summary,
      findings
    };

    spinner.stop(`Drift analysis complete.`);

    // Render report
    const renderedReport = renderReport(report, options.format);

    if (options.report) {
      fs.writeFileSync(options.report, renderedReport, "utf-8");
      p.note(`Report written to ${options.report}`, "Audit complete");
    }

    // Print to console
    console.log(renderedReport);

    // Write report artifact if in CI
    if (options.format === "markdown" && process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "\n" + renderedReport);
    }

    // Determine exit code
    if (report.status === "fail" && options.failOnDrift) {
      return 1;
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    p.cancel(`Audit failed: ${message}`);
    return 2;
  }
}

export function buildAuditCommand(): Command {
  const cmd = new Command("audit");

  cmd
    .description("Compare current repository against committed baseline and report drift")
    .option("-t, --target <path>", "Target repository path", process.cwd())
    .option("--baseline <path>", "Baseline file path", undefined)
    .option(
      "--format <type>",
      "Report format: text, markdown, json",
      "text"
    )
    .option("--report <path>", "Write report to file", undefined)
    .option("--fail-on-drift", "Exit non-zero when blocking drift exists (default in CI)", undefined)
    .option("--no-fail-on-drift", "Exit zero even when drift exists (default locally)", undefined)
    .option("--cluster-drift-threshold <percent>", "Cluster composition drift threshold percentage", "25")
    .option("--update-baseline", "Create or update baseline from current scan", false)
    .action(async (parsedOptions) => {
      // Determine failOnDrift default based on environment
      let failOnDrift = true; // Default to true
      if (parsedOptions.failOnDrift === false) {
        failOnDrift = false;
      } else if (parsedOptions.failOnDrift === true) {
        failOnDrift = true;
      } else {
        // Auto-detect CI environment
        failOnDrift = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
      }

      const options: AuditOptions = {
        target: parsedOptions.target,
        baseline: parsedOptions.baseline,
        format: parsedOptions.format || "text",
        report: parsedOptions.report,
        failOnDrift,
        clusterDriftThreshold: Number(parsedOptions.clusterDriftThreshold),
        updateBaseline: Boolean(parsedOptions.updateBaseline)
      };

      const exitCode = await runAudit(options);
      process.exit(exitCode);
    });

  return cmd;
}
