export type ArtifactFamily = "instructions" | "rules" | "skills" | "hooks" | "agents" | "commands";

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
  orgConfig?: string;
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

export interface OrgPolicy {
  [key: string]: unknown;
}

export interface CodingPolicy {
  language_style?: Record<string, unknown>;
  import_rules?: string;
  annotation_enforcement?: Array<{ annotation: string; rule: string }>;
}

export interface ApiDesignPolicy {
  request_envelope?: { enabled: boolean; template: string };
  authentication?: { method: string; scopes_required?: string[] };
  error_codes?: Array<{ code: string; meaning: string; http_status: number }>;
}

export interface TestingPolicy {
  minimum_coverage?: number;
  test_types_required?: string[];
  framework_approved?: Record<string, string[]>;
}

export interface SecurityPolicy {
  secrets_policy?: string;
  pii_handling?: string;
  authentication_required?: boolean;
}

export interface DeploymentPolicy {
  health_check_endpoint?: string;
  readiness_check_endpoint?: string;
  graceful_shutdown_timeout?: string;
  blue_green_supported?: boolean;
}

export interface ObservabilityPolicy {
  logging_format?: string;
  trace_header?: string;
  metrics_system?: string;
  required_metrics?: string[];
}

export interface StackDefinition {
  build_command?: string;
  test_command?: string;
  frameworks_approved?: string[];
  conventions_file?: string;
}

export interface CustomPolicy {
  policy_name: string;
  wiki_file: string;
  content?: Record<string, unknown>;
}

export interface OrgConfig {
  organization?: {
    name?: string;
    domain?: string;
  };
  policies?: {
    coding?: CodingPolicy;
    api_design?: ApiDesignPolicy;
    testing?: TestingPolicy;
    security?: SecurityPolicy;
    deployment?: DeploymentPolicy;
    observability?: ObservabilityPolicy;
    custom?: CustomPolicy[];
  };
  stacks?: {
    [key: string]: StackDefinition;
  };
}

export interface WikiFile {
  filename: string;
  title: string;
  description: string;
  content: string;
  isFixed: boolean;
}

export interface EnforcementArtifact {
  family: "rules" | "agents" | "skills" | "commands";
  relativePath: string;
  content: string;
  enforcedPolicy: string;
}