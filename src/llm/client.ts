import Anthropic from "@anthropic-ai/sdk";
import type { GenerationClient, GenerationInput } from "../types.js";

function fallbackMockContent(input: GenerationInput): string {
  const header = input.clusterName ? `${input.artifactTitle} (${input.clusterName})` : input.artifactTitle;

  switch (input.family) {
    case "instructions":
      return [
        `## ${header}`,
        "",
        "Use this repository guidance before making changes.",
        "",
        "### Workflow",
        "- Read the nearby files before editing.",
        "- Keep changes scoped to the requested area.",
        "- Run the narrowest useful verification command before handing off.",
        "",
        "### Notes",
        input.prompt.slice(0, 800)
      ].join("\n");
    case "rules":
      return [
        "## Scope",
        "- Stay within the requested feature boundary.",
        "- Preserve existing public behavior unless the task explicitly changes it.",
        "",
        "## Verification",
        "- Run targeted tests after edits.",
        "- Call out assumptions that could not be validated.",
        "",
        "## Context",
        input.prompt.slice(0, 800)
      ].join("\n");
    case "skills":
      return [
        "# Overview",
        "",
        "This skill focuses on a high-signal workflow within the repository.",
        "",
        "## When to Use",
        "- Use this when changes are concentrated in the mapped subsystem.",
        "",
        "## Verification",
        "- Re-run local tests relevant to the touched files."
      ].join("\n");
    case "agents":
      return [
        "## Purpose",
        "- Own changes in the mapped subsystem and keep scope tight.",
        "",
        "## Operating Model",
        "- Inspect adjacent files before editing.",
        "- Prefer root-cause fixes and narrow validation.",
        "",
        "## Focus",
        input.prompt.slice(0, 800)
      ].join("\n");
    case "hooks":
      return "Validate generated changes with the narrowest reliable local command.";
    case "commands":
      return "Run the relevant CLI command to verify the changed subsystem.";
  }
}

export class MockGenerationClient implements GenerationClient {
  public readonly mode = "mock" as const;

  async generate(input: GenerationInput): Promise<string> {
    return fallbackMockContent(input);
  }
}

export class AnthropicGenerationClient implements GenerationClient {
  public readonly mode = "anthropic" as const;
  private readonly client: Anthropic;

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {
    this.client = new Anthropic({ apiKey: this.apiKey, maxRetries: 2, timeout: 30_000 });
  }

  async generate(input: GenerationInput): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2_000,
      temperature: 0.2,
      system: "You generate concise repository guidance artifacts for coding agents. Return body content only, never frontmatter or wrapper syntax. Keep the content deterministic, practical, and scoped to the supplied repository summary.",
      messages: [
        {
          role: "user",
          content: input.prompt
        }
      ]
    });

    const textBlocks = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text);

    return textBlocks.join("\n").trim();
  }
}

export function createGenerationClient(options: { mock: boolean; apiKey?: string; model: string }): GenerationClient {
  if (options.mock) {
    return new MockGenerationClient();
  }

  if (!options.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for live generation.");
  }

  return new AnthropicGenerationClient(options.apiKey, options.model);
}