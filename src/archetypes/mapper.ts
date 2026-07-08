import type { TemplateFamily } from "./registry.js";

export type ArchetypeTarget = "claude" | "copilot" | "cursor";

export interface MappedArtifact {
  relativePath: string;
  frontmatterOverride?: Record<string, unknown>;
}

export function mapArtifact(family: TemplateFamily, slug: string, target: ArchetypeTarget): MappedArtifact {
  switch (family) {
    case "instructions":
      return { relativePath: target === "claude" ? "CLAUDE.md" : "AGENTS.md" };

    case "rules": {
      const frontmatterByTarget: Record<ArchetypeTarget, Record<string, unknown>> = {
        claude: { paths: ["**"] },
        copilot: { applyTo: "**" },
        cursor: { description: slug, globs: ["**/*"], alwaysApply: true }
      };
      const pathByTarget: Record<ArchetypeTarget, string> = {
        claude: `.claude/rules/${slug}.md`,
        copilot: `.github/instructions/${slug}.instructions.md`,
        cursor: `.cursor/rules/${slug}.mdc`
      };
      return {
        relativePath: pathByTarget[target],
        frontmatterOverride: frontmatterByTarget[target]
      };
    }

    case "agents": {
      const pathByTarget: Record<ArchetypeTarget, string> = {
        claude: `.claude/agents/${slug}.agent.md`,
        copilot: `.github/agents/${slug}.agent.md`,
        cursor: `.cursor/agents/${slug}.agent.md`
      };
      return { relativePath: pathByTarget[target] };
    }

    case "skills": {
      const pathByTarget: Record<ArchetypeTarget, string> = {
        claude: `.claude/skills/${slug}/SKILL.md`,
        copilot: `.github/skills/${slug}/SKILL.md`,
        cursor: `.cursor/skills/${slug}/SKILL.md`
      };
      return { relativePath: pathByTarget[target] };
    }

    case "commands": {
      const pathByTarget: Record<ArchetypeTarget, string> = {
        claude: `.claude/commands/${slug}.md`,
        copilot: `.github/prompts/${slug}.prompt.md`,
        cursor: `.cursor/commands/${slug}.md`
      };
      return { relativePath: pathByTarget[target] };
    }
  }
}
