import fs from "node:fs";
import path from "node:path";
import type { GeneratedArtifact, GenerationClient, PlannedArtifact, ScanResult } from "./types.js";

function escapeYamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function renderYamlValue(value: unknown, indent = 0): string[] {
  const prefix = "  ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${prefix}[]`];
    }

    return value.flatMap((entry) => {
      if (typeof entry === "string") {
        return [`${prefix}- ${escapeYamlString(entry)}`];
      }

      return [`${prefix}- ${String(entry)}`];
    });
  }

  if (typeof value === "boolean") {
    return [`${prefix}${value ? "true" : "false"}`];
  }

  if (typeof value === "number") {
    return [`${prefix}${value}`];
  }

  return [`${prefix}${escapeYamlString(String(value))}`];
}

function renderFrontmatter(metadata: Record<string, unknown>): string {
  const lines = ["---"];

  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      lines.push(...renderYamlValue(value, 1));
      continue;
    }

    lines.push(`${key}: ${renderYamlValue(value)[0] ?? ""}`);
  }

  lines.push("---");
  return lines.join("\n");
}

function renderJson(content: unknown): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

function escapeTomlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderToml(content: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(content)) {
    if (Array.isArray(value)) {
      const items = value.map((entry) => `"${escapeTomlString(String(entry))}"`).join(", ");
      lines.push(`${key} = [${items}]`);
      continue;
    }

    if (typeof value === "string" && value.includes("\n")) {
      lines.push(`${key} = """`);
      lines.push(value);
      lines.push('"""');
      continue;
    }

    if (typeof value === "boolean") {
      lines.push(`${key} = ${value ? "true" : "false"}`);
      continue;
    }

    lines.push(`${key} = "${escapeTomlString(String(value))}"`);
  }

  return `${lines.join("\n")}\n`;
}

function inferValidationCommand(scanResult: ScanResult): string {
  const languages = new Set(scanResult.files.map((file) => file.language));

  if (languages.has("ts") || languages.has("tsx")) {
    return "npm test";
  }

  if (languages.has("py")) {
    return "python -m pytest";
  }

  if (languages.has("java")) {
    return "./mvnw test";
  }

  return "echo configure-project-validation-command";
}

function renderArtifact(request: PlannedArtifact, body: string, scanResult: ScanResult): string {
  switch (request.renderKind) {
    case "root-agents":
    case "claude-instructions":
    case "copilot-instructions":
      return `${body.trim()}\n`;
    case "copilot-rule":
    case "copilot-skill":
    case "copilot-agent":
    case "cursor-rule":
    case "claude-rule":
    case "claude-agent":
      return `${renderFrontmatter(request.metadata ?? {})}\n\n${body.trim()}\n`;
    case "copilot-hook":
      return renderJson({
        version: 1,
        hooks: [
          {
            name: request.slug,
            description: request.title,
            command: inferValidationCommand(scanResult),
            when: ["after-write"]
          }
        ]
      });
    case "claude-hook":
      return renderJson({
        hooks: {
          PostToolUse: [
            {
              matcher: "Write|Edit|MultiEdit",
              hooks: [
                {
                  type: "command",
                  command: inferValidationCommand(scanResult),
                  description: request.title
                }
              ]
            }
          ]
        }
      });
    case "codex-rule":
      return [
        `prefix_rule(\"${request.slug}\", \"\"\"`,
        body.trim(),
        '\"\"\")',
        ""
      ].join("\n");
    case "codex-agent":
      return renderToml({
        name: request.metadata?.name ?? request.title,
        description: request.metadata?.description ?? request.title,
        tools: request.metadata?.tools ?? ["read_file", "grep_search", "apply_patch", "run_in_terminal"],
        developer_instructions: body.trim()
      });
    case "codex-hook":
      return renderJson({
        hooks: [
          {
            event: "after_write",
            name: request.slug,
            description: request.title,
            command: inferValidationCommand(scanResult)
          }
        ]
      });
  }
}

function validateArtifact(request: PlannedArtifact, content: string): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid ${request.target}/${request.family} artifact at ${request.relativePath}: ${reason}`);
  };

  if (!request.relativePath) {
    fail("missing output path");
  }

  switch (request.renderKind) {
    case "copilot-skill": {
      if (!request.relativePath.endsWith("/SKILL.md")) {
        fail("skills must end with /SKILL.md");
      }

      const name = request.metadata?.name;
      const description = request.metadata?.description;

      if (typeof name !== "string" || typeof description !== "string") {
        fail("skills require name and description metadata");
      }

      break;
    }
    case "copilot-agent":
      if (!request.relativePath.endsWith(".agent.md")) {
        fail("copilot agents must use .agent.md extension");
      }
      break;
    case "cursor-rule":
      if (!request.relativePath.endsWith(".mdc")) {
        fail("cursor rules must use .mdc extension");
      }
      break;
    case "claude-agent":
      if (!request.relativePath.startsWith(".claude/agents/")) {
        fail("claude agents must live under .claude/agents/");
      }
      break;
    case "claude-rule":
      if (!request.relativePath.startsWith(".claude/rules/")) {
        fail("claude rules must live under .claude/rules/");
      }
      break;
    case "codex-agent":
      if (!request.relativePath.endsWith(".toml")) {
        fail("codex agents must use .toml extension");
      }
      break;
    case "codex-rule":
      if (!request.relativePath.endsWith(".rules")) {
        fail("codex rules must use .rules extension");
      }
      break;
    case "copilot-hook":
    case "claude-hook":
    case "codex-hook":
      try {
        JSON.parse(content);
      } catch (error) {
        fail(`hook JSON did not parse: ${error instanceof Error ? error.message : String(error)}`);
      }
      break;
  }
}

export async function materializeArtifacts(
  targetRoot: string,
  requests: PlannedArtifact[],
  client: GenerationClient,
  dryRun: boolean,
  scanResult: ScanResult
): Promise<GeneratedArtifact[]> {
  const generated: GeneratedArtifact[] = [];

  for (const request of requests) {
    const parts: string[] = [];

    if (request.llmRequired) {
      for (const prompt of request.promptWindows) {
        const contentPart = await client.generate({
          family: request.family,
          target: request.target,
          renderKind: request.renderKind,
          prompt,
          clusterName: request.clusterName,
          artifactTitle: request.title
        });
        parts.push(contentPart);
      }
    }

    const mergedBody = request.mergeInstruction && parts.length > 1
      ? await client.generate({
          family: request.family,
          target: request.target,
          renderKind: request.renderKind,
          prompt: [request.mergeInstruction, "Window outputs:", ...parts].join("\n\n"),
          clusterName: request.clusterName,
          artifactTitle: request.title
        })
      : parts.join("\n\n---\n\n");

    const content = renderArtifact(request, mergedBody, scanResult);
    validateArtifact(request, content);

    generated.push({
      relativePath: request.relativePath,
      content,
      family: request.family,
      target: request.target
    });

    if (dryRun) {
      continue;
    }

    const absolutePath = path.join(targetRoot, request.relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }

  return generated;
}