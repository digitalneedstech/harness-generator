import type { AuditReport } from "../types.js";

export type ReportFormat = "text" | "markdown" | "json";

export function renderReport(report: AuditReport, format: ReportFormat): string {
  switch (format) {
    case "text":
      return renderTextReport(report);
    case "markdown":
      return renderMarkdownReport(report);
    case "json":
      return JSON.stringify(report, null, 2);
  }
}

function renderTextReport(report: AuditReport): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push(`HARNESS AUDIT REPORT - ${report.status.toUpperCase()}`);
  lines.push("=".repeat(60));
  lines.push("");

  // Summary
  lines.push("SUMMARY");
  lines.push("-".repeat(40));
  lines.push(`  Files Added:       ${report.summary.filesAdded}`);
  lines.push(`  Files Deleted:     ${report.summary.filesDeleted}`);
  lines.push(`  Clusters Changed:  ${report.summary.clustersChanged}`);
  lines.push(`  Stale Artifacts:   ${report.summary.staleArtifacts}`);
  lines.push(`  ⚠️  Blocking Issues: ${report.summary.blockingFindings}`);
  lines.push("");

  if (report.findings.length === 0) {
    lines.push("✓ No drift detected. Harness is up to date.");
  } else {
    lines.push("FINDINGS");
    lines.push("-".repeat(40));

    for (const finding of report.findings) {
      const icon = finding.blocking ? "❌" : finding.severity === "error" ? "🔴" : finding.severity === "warning" ? "⚠️ " : "ℹ️ ";

      lines.push(`${icon} [${finding.code}] ${finding.message}`);
      if (finding.paths.length > 0 && finding.paths.length <= 5) {
        finding.paths.forEach((p) => {
          lines.push(`     • ${p}`);
        });
      } else if (finding.paths.length > 5) {
        lines.push(`     • ${finding.paths.slice(0, 5).join(", ")}`);
        lines.push(`     • ... and ${finding.paths.length - 5} more`);
      }
      lines.push(`     → Recommendation: ${finding.recommendation}`);
      lines.push("");
    }
  }

  lines.push("=".repeat(60));
  lines.push("");

  return lines.join("\n");
}

function renderMarkdownReport(report: AuditReport): string {
  const lines: string[] = [];

  lines.push("# Harness Drift Check");
  lines.push("");

  const statusEmoji = report.status === "pass" ? "✅" : "❌";
  lines.push(`## Status: ${statusEmoji} ${report.status.toUpperCase()}`);
  lines.push("");

  // Summary table
  lines.push("### Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Files Added | ${report.summary.filesAdded} |`);
  lines.push(`| Files Deleted | ${report.summary.filesDeleted} |`);
  lines.push(`| Clusters Changed | ${report.summary.clustersChanged} |`);
  lines.push(`| Stale Artifacts | ${report.summary.staleArtifacts} |`);
  lines.push(`| **Blocking Issues** | **${report.summary.blockingFindings}** |`);
  lines.push("");

  if (report.findings.length === 0) {
    lines.push("✓ No drift detected. Your harness artifacts are up to date with the current repository structure.");
  } else {
    lines.push("### Findings");
    lines.push("");

    // Group findings by severity
    const byCode = new Map<string, typeof report.findings>();
    for (const finding of report.findings) {
      if (!byCode.has(finding.code)) {
        byCode.set(finding.code, []);
      }
      byCode.get(finding.code)!.push(finding);
    }

    for (const [code, findings] of byCode) {
      const firstFinding = findings[0];
      const blockingBadge = firstFinding.blocking ? " 🚫 **BLOCKING**" : "";
      const severityEmoji =
        firstFinding.severity === "error"
          ? "🔴"
          : firstFinding.severity === "warning"
            ? "⚠️"
            : "ℹ️";

      lines.push(`#### ${severityEmoji} ${code}${blockingBadge}`);
      lines.push("");

      for (const finding of findings) {
        lines.push(`**${finding.message}**`);
        lines.push("");

        if (finding.paths.length > 0) {
          lines.push("Affected paths:");
          lines.push("");
          const displayPaths = finding.paths.slice(0, 10);
          for (const path of displayPaths) {
            lines.push(`- \`${path}\``);
          }
          if (finding.paths.length > 10) {
            lines.push(`- ... and ${finding.paths.length - 10} more`);
          }
          lines.push("");
        }

        lines.push(`**Recommendation:**`);
        lines.push("");
        lines.push(`> ${finding.recommendation}`);
        lines.push("");
      }
    }

    // Add remediation section
    lines.push("### How to Fix");
    lines.push("");
    const hasBlockingIssues = report.summary.blockingFindings > 0;
    if (hasBlockingIssues) {
      lines.push("**Blocking issues detected.** Follow these steps:");
      lines.push("");
      lines.push("1. Review the findings above to understand what failed");
      lines.push("2. Take one of these actions:");
      lines.push("   - **Add missing artifacts**: Create new agents, skills, rules, or instructions to cover new clusters");
      lines.push("   - **Remove stale artifacts**: Delete artifact files that reference deleted source files");
      lines.push("   - **Update the harness**: Regenerate affected artifacts to match current code structure");
      lines.push("3. Run `harness-gen audit --update-baseline` to record the new baseline");
      lines.push("4. Commit both the updated artifacts AND `.agent-harness/baseline.json`");
      lines.push("5. Push the PR; the drift check will pass");
    } else {
      lines.push("No blocking issues. Review the warnings above and update your baseline if satisfied:");
      lines.push("");
      lines.push("```bash");
      lines.push("harness-gen audit --update-baseline");
      lines.push("git add .agent-harness/baseline.json");
      lines.push("git commit -m 'Update harness baseline'");
      lines.push("```");
    }
    lines.push("");
  }

  return lines.join("\n");
}
