export type ArtifactFamily = "instructions" | "rules" | "skills" | "hooks" | "agents";

export type TargetTool = "standard" | "claude" | "cursor" | "copilot" | "codex";

export type ConcreteTargetTool = Exclude<TargetTool, "standard">;

export type RenderKind =
  | "root-agents"
  | "claude-instructions"
  | "copilot-instructions"
  | "copilot-rule"
  | "copilot-skill"
  | "copilot-agent"
  | "copilot-hook"
  | "cursor-rule"
  | "claude-rule"
  | "claude-agent"
  | "claude-hook"
  | "codex-rule"
  | "codex-agent"
  | "codex-hook";

export type DetectedFramework =
  | "Next.js"
  | "Express"
  | "Spring Boot"
  | "FastAPI"
  | "Flask"
  | "Standard TS"
  | "Standard Java"
  | "Standard Python";

export interface EndpointSummary {
  framework: DetectedFramework;
  routePath: string;
  httpMethod: string;
  signature: string;
  sourceSymbol?: string;
}

export interface FileSummary {
  filePath: string;
  hash: string;
  endpoints: EndpointSummary[];
  dependencies: string[];
  language: "ts" | "tsx" | "java" | "py";
}

export interface ClusterSummary {
  name: string;
  files: string[];
  endpointCount: number;
}

export interface CacheRecord {
  hash: string;
  endpoints: EndpointSummary[];
  dependencies: string[];
  language: FileSummary["language"];
}

export type CacheMap = Record<string, CacheRecord>;

export interface ScanResult {
  targetRoot: string;
  files: FileSummary[];
  clusters: ClusterSummary[];
}

export interface PromptLimits {
  maxFilesPerPrompt: number;
  maxEndpointsPerPrompt: number;
}

export interface CliOptions extends PromptLimits {
  target: string;
  outputs: ArtifactFamily[];
  targets: TargetTool[];
  scanOnly: boolean;
  dryRun: boolean;
  mock: boolean;
}

export interface PlannedArtifact {
  family: ArtifactFamily;
  target: TargetTool;
  renderKind: RenderKind;
  relativePath: string;
  promptWindows: string[];
  mergeInstruction?: string;
  clusterName?: string;
  slug: string;
  title: string;
  metadata?: Record<string, unknown>;
  llmRequired: boolean;
}

export interface GeneratedArtifact {
  relativePath: string;
  content: string;
  family: ArtifactFamily;
  target: TargetTool;
}

export interface GenerationInput {
  family: ArtifactFamily;
  target: TargetTool;
  renderKind: RenderKind;
  prompt: string;
  clusterName?: string;
  artifactTitle: string;
}

export interface GenerationClient {
  readonly mode: "anthropic" | "mock";
  generate(input: GenerationInput): Promise<string>;
}