import type {
  ArtifactFamily,
  ClusterSummary,
  FileSummary,
  PlannedArtifact,
  PromptLimits,
  RenderKind,
  ScanResult,
  TargetTool
} from "../types.js";

const MAX_SIGNAL_CLUSTERS = 3;

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildBoundedClusterWindows(clusters: ClusterSummary[], limits: PromptLimits): ClusterSummary[][] {
  const windows: ClusterSummary[][] = [];
  let currentWindow: ClusterSummary[] = [];
  let currentFileCount = 0;
  let currentEndpointCount = 0;

  for (const cluster of clusters) {
    const boundedFiles = Math.min(cluster.files.length, limits.maxFilesPerPrompt);
    const boundedEndpoints = Math.min(cluster.endpointCount, limits.maxEndpointsPerPrompt);
    const wouldOverflowFiles = currentFileCount > 0 && currentFileCount + boundedFiles > limits.maxFilesPerPrompt;
    const wouldOverflowEndpoints = currentEndpointCount > 0 && currentEndpointCount + boundedEndpoints > limits.maxEndpointsPerPrompt;

    if (wouldOverflowFiles || wouldOverflowEndpoints) {
      windows.push(currentWindow);
      currentWindow = [];
      currentFileCount = 0;
      currentEndpointCount = 0;
    }

    currentWindow.push(cluster);
    currentFileCount += boundedFiles;
    currentEndpointCount += boundedEndpoints;
  }

  if (currentWindow.length > 0) {
    windows.push(currentWindow);
  }

  return windows;
}

interface ClusterPromptWindow {
  fileCount: number;
  endpointCount: number;
  summary: string;
}

function buildClusterPromptWindows(cluster: ClusterSummary, files: FileSummary[], limits: PromptLimits): ClusterPromptWindow[] {
  const clusterFiles = cluster.files
    .map((filePath) => files.find((file) => file.filePath === filePath))
    .filter((file): file is FileSummary => Boolean(file));

  const fileWindows = chunkItems(clusterFiles, limits.maxFilesPerPrompt);
  const windows: ClusterPromptWindow[] = [];

  for (const fileWindow of fileWindows) {
    const endpointRecords = fileWindow.flatMap((file) =>
      file.endpoints.map((endpoint) => ({ file, endpoint }))
    );

    const endpointWindows = endpointRecords.length > 0
      ? chunkItems(endpointRecords, limits.maxEndpointsPerPrompt)
      : [[]];

    for (const endpointWindow of endpointWindows) {
      const endpointLines = endpointWindow.map(({ file, endpoint }) =>
        `- ${file.filePath}: [${endpoint.framework}] ${endpoint.httpMethod} ${endpoint.routePath} -> ${endpoint.signature}`
      );

      windows.push({
        fileCount: fileWindow.length,
        endpointCount: endpointWindow.length,
        summary: [
          `Cluster: ${cluster.name}`,
          `Files in this window: ${fileWindow.length}/${clusterFiles.length}`,
          `Endpoints in this window: ${endpointWindow.length}/${cluster.endpointCount}`,
          "Included files:",
          ...fileWindow.map((file) => `- ${file.filePath} (${file.language}, deps: ${file.dependencies.length}, endpoints: ${file.endpoints.length})`),
          "Endpoint highlights:",
          ...(endpointLines.length > 0 ? endpointLines : ["- No endpoints detected in included files."])
        ].join("\n")
      });
    }
  }

  return windows;
}

function repoOverview(scanResult: ScanResult): string {
  return [
    `Target root: ${scanResult.targetRoot}`,
    `Scanned files: ${scanResult.files.length}`,
    `Derived clusters: ${scanResult.clusters.length}`,
    `Framework hits: ${scanResult.files.flatMap((file) => file.endpoints).map((endpoint) => endpoint.framework).join(", ") || "None"}`
  ].join("\n");
}

function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clusterScore(cluster: ClusterSummary, files: FileSummary[]): number {
  const clusterFiles = cluster.files
    .map((filePath) => files.find((file) => file.filePath === filePath))
    .filter((file): file is FileSummary => Boolean(file));
  const languageCount = new Set(clusterFiles.map((file) => file.language)).size;
  return cluster.endpointCount * 100 + cluster.files.length * 10 + languageCount;
}

function selectSignalClusters(scanResult: ScanResult): ClusterSummary[] {
  const scored = scanResult.clusters.map((cluster) => ({
    cluster,
    score: clusterScore(cluster, scanResult.files)
  }));
  const interesting = scored.filter(({ cluster }) => cluster.endpointCount > 0 || cluster.files.length > 1);
  const base = interesting.length > 0 ? interesting : scored;

  return base
    .sort((left, right) => right.score - left.score || left.cluster.name.localeCompare(right.cluster.name))
    .slice(0, MAX_SIGNAL_CLUSTERS)
    .map(({ cluster }) => cluster);
}

function buildBodyPrompt(
  family: ArtifactFamily,
  title: string,
  scanResult: ScanResult,
  target: TargetTool,
  renderKind: RenderKind,
  contextSummary?: string
): string {
  const sections = [
    `Generate the body content for ${title}.`,
    `Target tool: ${target}.`,
    `Artifact type: ${renderKind}.`,
    "Return body content only. Do not emit YAML frontmatter, JSON, TOML, Starlark wrappers, or fenced code blocks unless the body itself genuinely needs an example.",
    "Keep the result deterministic, concise, and directly usable in the analyzed repository.",
    repoOverview(scanResult)
  ];

  if (contextSummary) {
    sections.push("Context summary:");
    sections.push(contextSummary);
  }

  if (renderKind === "root-agents") {
    sections.push("Write a repository-level AGENTS.md for coding agents.");
    sections.push("Focus on what an agent needs before making changes: project purpose, major code areas, required workflows, build and test commands, guardrails, and task handoff expectations.");
    sections.push("Prefer clear sections with short actionable bullets and concrete commands over generic prose.");
    return sections.join("\n\n");
  }

  if (renderKind === "claude-instructions") {
    sections.push("Write a repository-level CLAUDE.md for Claude Code sessions.");
    sections.push("Focus on repository context, architecture boundaries, development commands, agent-relevant constraints, and practical guidance that should load into Claude sessions.");
    sections.push("Keep it operational and repository-specific rather than aspirational.");
    return sections.join("\n\n");
  }

  switch (family) {
    case "instructions":
      sections.push("Write concise repository guidance covering architecture boundaries, build and test workflow, and safe editing expectations.");
      break;
    case "rules":
      sections.push("Write rule content with short sections for scope, guardrails, and verification expectations.");
      break;
    case "skills":
      sections.push("Write a skill body with sections for When to Use, Boundaries, Key Files, Workflow, and Verification.");
      break;
    case "hooks":
      sections.push("Summarize the validation intent in one or two sentences. The wrapper config is rendered by code.");
      break;
    case "agents":
      sections.push("Write an agent body with sections for Purpose, When to Invoke, Key Files, and Execution Notes.");
      break;
  }

  return sections.join("\n\n");
}

function buildMergePrompt(title: string, scanResult: ScanResult): string {
  return [
    `Merge multiple partial analyses for ${title} into one coherent body.`,
    "Do not repeat sections unless necessary.",
    "Preserve deterministic, repository-specific guidance and reconcile overlapping details into one clean result.",
    repoOverview(scanResult)
  ].join("\n\n");
}

function buildRepoPromptWindows(
  scanResult: ScanResult,
  limits: PromptLimits,
  clusterWindowMap: Map<string, ClusterPromptWindow[]>,
  family: ArtifactFamily,
  title: string,
  target: TargetTool,
  renderKind: RenderKind
): { promptWindows: string[]; mergeInstruction?: string } {
  const repoWindowUnits = scanResult.clusters.flatMap((cluster) =>
    (clusterWindowMap.get(cluster.name) ?? []).map((window, index) => ({
      cluster,
      window,
      generatedName: `${cluster.name}-window-${index + 1}`
    }))
  );

  const repoWindows = buildBoundedClusterWindows(
    repoWindowUnits.map(({ generatedName, cluster, window }) => ({
      name: generatedName,
      files: cluster.files.slice(0, window.fileCount),
      endpointCount: window.endpointCount
    })),
    limits
  );

  const promptWindows = repoWindows.map((windowClusters, index, allWindows) => {
    const clusterSummaries = windowClusters
      .map((windowCluster) => repoWindowUnits.find((unit) => unit.generatedName === windowCluster.name)?.window.summary ?? "")
      .filter(Boolean)
      .join("\n\n---\n\n");

    return [
      `Repository window ${index + 1} of ${allWindows.length}`,
      buildBodyPrompt(family, title, scanResult, target, renderKind, clusterSummaries)
    ].join("\n\n");
  });

  return {
    promptWindows,
    mergeInstruction: promptWindows.length > 1 ? buildMergePrompt(title, scanResult) : undefined
  };
}

function buildClusterPromptSet(
  scanResult: ScanResult,
  cluster: ClusterSummary,
  clusterWindowMap: Map<string, ClusterPromptWindow[]>,
  family: ArtifactFamily,
  title: string,
  target: TargetTool,
  renderKind: RenderKind
): { promptWindows: string[]; mergeInstruction?: string } {
  const promptWindows = (clusterWindowMap.get(cluster.name) ?? []).map((window, index, allWindows) =>
    buildBodyPrompt(
      family,
      title,
      scanResult,
      target,
      renderKind,
      [`Cluster window ${index + 1} of ${allWindows.length}`, window.summary].join("\n\n")
    )
  );

  return {
    promptWindows,
    mergeInstruction: promptWindows.length > 1 ? buildMergePrompt(title, scanResult) : undefined
  };
}

function addArtifact(planned: Map<string, PlannedArtifact>, artifact: PlannedArtifact): void {
  if (!planned.has(artifact.relativePath)) {
    planned.set(artifact.relativePath, artifact);
  }
}

function buildAgentMetadata(slug: string, label: string): Record<string, unknown> {
  return {
    name: slug,
    description: `Specialist for ${label}.`,
    tools: ["read_file", "grep_search", "apply_patch", "run_in_terminal"]
  };
}

export function buildArtifactRequests(
  scanResult: ScanResult,
  outputs: ArtifactFamily[],
  limits: PromptLimits,
  targets: TargetTool[]
): PlannedArtifact[] {
  const planned = new Map<string, PlannedArtifact>();
  const clusterWindowMap = new Map(
    scanResult.clusters.map((cluster) => [cluster.name, buildClusterPromptWindows(cluster, scanResult.files, limits)])
  );
  const signalClusters = selectSignalClusters(scanResult);
  const hasTarget = (target: TargetTool): boolean => targets.includes("standard") || targets.includes(target);
  const shouldGenerateClaudeMd = hasTarget("claude");
  const shouldGenerateAgentsMd = targets.includes("standard") || targets.includes("copilot") || targets.includes("cursor") || targets.includes("codex");

  if (shouldGenerateAgentsMd) {
    const title = "Repository AGENTS";
    const promptSet = buildRepoPromptWindows(scanResult, limits, clusterWindowMap, "instructions", title, "standard", "root-agents");
    addArtifact(planned, {
      family: "instructions",
      target: "standard",
      renderKind: "root-agents",
      relativePath: "AGENTS.md",
      promptWindows: promptSet.promptWindows,
      mergeInstruction: promptSet.mergeInstruction,
      slug: "agents",
      title,
      llmRequired: true
    });
  }

  if (shouldGenerateClaudeMd) {
    const title = "Repository CLAUDE Guidance";
    const promptSet = buildRepoPromptWindows(scanResult, limits, clusterWindowMap, "instructions", title, "claude", "claude-instructions");
    addArtifact(planned, {
      family: "instructions",
      target: "claude",
      renderKind: "claude-instructions",
      relativePath: "CLAUDE.md",
      promptWindows: promptSet.promptWindows,
      mergeInstruction: promptSet.mergeInstruction,
      slug: "claude-guidance",
      title,
      llmRequired: true
    });
  }

  if (outputs.includes("instructions")) {

    if (hasTarget("copilot")) {
      const title = "Repository Copilot Instructions";
      const promptSet = buildRepoPromptWindows(scanResult, limits, clusterWindowMap, "instructions", title, "copilot", "copilot-instructions");
      addArtifact(planned, {
        family: "instructions",
        target: "copilot",
        renderKind: "copilot-instructions",
        relativePath: ".github/copilot-instructions.md",
        promptWindows: promptSet.promptWindows,
        mergeInstruction: promptSet.mergeInstruction,
        slug: "copilot-instructions",
        title,
        llmRequired: true
      });
    }
  }

  if (outputs.includes("rules")) {
    if (hasTarget("copilot")) {
      const title = "Repository Rules";
      const promptSet = buildRepoPromptWindows(scanResult, limits, clusterWindowMap, "rules", title, "copilot", "copilot-rule");
      addArtifact(planned, {
        family: "rules",
        target: "copilot",
        renderKind: "copilot-rule",
        relativePath: ".github/instructions/repository-rules.instructions.md",
        promptWindows: promptSet.promptWindows,
        mergeInstruction: promptSet.mergeInstruction,
        slug: "repository-rules",
        title,
        metadata: {
          name: "repository-rules",
          description: "Repository guardrails for coding agents.",
          applyTo: "**"
        },
        llmRequired: true
      });
    }

    if (hasTarget("cursor")) {
      const title = "Repository Rules";
      const promptSet = buildRepoPromptWindows(scanResult, limits, clusterWindowMap, "rules", title, "cursor", "cursor-rule");
      addArtifact(planned, {
        family: "rules",
        target: "cursor",
        renderKind: "cursor-rule",
        relativePath: ".cursor/rules/repository-guidance.mdc",
        promptWindows: promptSet.promptWindows,
        mergeInstruction: promptSet.mergeInstruction,
        slug: "repository-guidance",
        title,
        metadata: {
          description: "Repository guardrails for coding agents.",
          globs: ["**/*"],
          alwaysApply: true
        },
        llmRequired: true
      });
    }

    if (hasTarget("claude")) {
      const title = "Repository Rules";
      const promptSet = buildRepoPromptWindows(scanResult, limits, clusterWindowMap, "rules", title, "claude", "claude-rule");
      addArtifact(planned, {
        family: "rules",
        target: "claude",
        renderKind: "claude-rule",
        relativePath: ".claude/rules/repository-guidance.md",
        promptWindows: promptSet.promptWindows,
        mergeInstruction: promptSet.mergeInstruction,
        slug: "repository-guidance",
        title,
        metadata: {
          description: "Repository guardrails for coding agents.",
          paths: ["**"]
        },
        llmRequired: true
      });
    }

    if (hasTarget("codex")) {
      const title = "Repository Rules";
      const promptSet = buildRepoPromptWindows(scanResult, limits, clusterWindowMap, "rules", title, "codex", "codex-rule");
      addArtifact(planned, {
        family: "rules",
        target: "codex",
        renderKind: "codex-rule",
        relativePath: ".codex/rules/repository.rules",
        promptWindows: promptSet.promptWindows,
        mergeInstruction: promptSet.mergeInstruction,
        slug: "repository_rules",
        title,
        llmRequired: true
      });
    }
  }

  if (outputs.includes("skills") && hasTarget("copilot")) {
    for (const cluster of signalClusters) {
      const label = humanizeSlug(cluster.name);
      const title = `${label} Skill`;
      const promptSet = buildClusterPromptSet(scanResult, cluster, clusterWindowMap, "skills", title, "copilot", "copilot-skill");
      addArtifact(planned, {
        family: "skills",
        target: "copilot",
        renderKind: "copilot-skill",
        relativePath: `.github/skills/${cluster.name}/SKILL.md`,
        promptWindows: promptSet.promptWindows,
        mergeInstruction: promptSet.mergeInstruction,
        clusterName: cluster.name,
        slug: cluster.name,
        title,
        metadata: {
          name: cluster.name,
          description: `Use when changes focus on ${label}.`
        },
        llmRequired: true
      });
    }
  }

  if (outputs.includes("hooks")) {
    if (hasTarget("copilot")) {
      addArtifact(planned, {
        family: "hooks",
        target: "copilot",
        renderKind: "copilot-hook",
        relativePath: ".github/hooks/validate-generated-changes.json",
        promptWindows: [],
        slug: "validate-generated-changes",
        title: "Validate generated changes",
        llmRequired: false
      });
    }

    if (hasTarget("claude")) {
      addArtifact(planned, {
        family: "hooks",
        target: "claude",
        renderKind: "claude-hook",
        relativePath: ".claude/settings.json",
        promptWindows: [],
        slug: "validate-generated-changes",
        title: "Validate generated changes",
        llmRequired: false
      });
    }

    if (hasTarget("codex")) {
      addArtifact(planned, {
        family: "hooks",
        target: "codex",
        renderKind: "codex-hook",
        relativePath: ".codex/hooks.json",
        promptWindows: [],
        slug: "validate-generated-changes",
        title: "Validate generated changes",
        llmRequired: false
      });
    }
  }

  if (outputs.includes("agents")) {
    for (const cluster of signalClusters) {
      const label = humanizeSlug(cluster.name);
      const title = `${label} Agent`;
      const metadata = buildAgentMetadata(cluster.name, label);

      if (hasTarget("copilot")) {
        const promptSet = buildClusterPromptSet(scanResult, cluster, clusterWindowMap, "agents", title, "copilot", "copilot-agent");
        addArtifact(planned, {
          family: "agents",
          target: "copilot",
          renderKind: "copilot-agent",
          relativePath: `.github/agents/${cluster.name}.agent.md`,
          promptWindows: promptSet.promptWindows,
          mergeInstruction: promptSet.mergeInstruction,
          clusterName: cluster.name,
          slug: cluster.name,
          title,
          metadata,
          llmRequired: true
        });
      }

      if (hasTarget("claude")) {
        const promptSet = buildClusterPromptSet(scanResult, cluster, clusterWindowMap, "agents", title, "claude", "claude-agent");
        addArtifact(planned, {
          family: "agents",
          target: "claude",
          renderKind: "claude-agent",
          relativePath: `.claude/agents/${cluster.name}.md`,
          promptWindows: promptSet.promptWindows,
          mergeInstruction: promptSet.mergeInstruction,
          clusterName: cluster.name,
          slug: cluster.name,
          title,
          metadata,
          llmRequired: true
        });
      }

      if (hasTarget("codex")) {
        const promptSet = buildClusterPromptSet(scanResult, cluster, clusterWindowMap, "agents", title, "codex", "codex-agent");
        addArtifact(planned, {
          family: "agents",
          target: "codex",
          renderKind: "codex-agent",
          relativePath: `.codex/agents/${cluster.name}.toml`,
          promptWindows: promptSet.promptWindows,
          mergeInstruction: promptSet.mergeInstruction,
          clusterName: cluster.name,
          slug: cluster.name,
          title,
          metadata,
          llmRequired: true
        });
      }
    }
  }

  return Array.from(planned.values()).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}