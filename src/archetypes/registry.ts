export type ArchetypeName =
  | "sdlc"
  | "sdlc-java-spring"
  | "sdlc-dotnet"
  | "sdlc-python-flask"
  | "sdlc-python-fastapi";

export type TemplateFamily = "instructions" | "rules" | "agents" | "skills" | "commands";

export interface TemplateRef {
  slug: string;
  family: TemplateFamily;
  templatePath: string;
}

export interface ArchetypeManifest {
  name: ArchetypeName;
  description: string;
  stackLabel: string;
  templates: TemplateRef[];
}

const BASE_SDLC_TEMPLATES: TemplateRef[] = [
  { slug: "instructions", family: "instructions", templatePath: "sdlc/instructions.md" },
  { slug: "sdlc-pipeline", family: "rules", templatePath: "sdlc/rules/sdlc-pipeline.md" },
  { slug: "sdlc-orchestrator", family: "agents", templatePath: "sdlc/agents/sdlc-orchestrator.agent.md" },
  { slug: "requirements-analyst", family: "agents", templatePath: "sdlc/agents/requirements-analyst.agent.md" },
  { slug: "implementation-planner", family: "agents", templatePath: "sdlc/agents/implementation-planner.agent.md" },
  { slug: "implementation-executor", family: "agents", templatePath: "sdlc/agents/implementation-executor.agent.md" },
  { slug: "plan-reviewer", family: "agents", templatePath: "sdlc/agents/plan-reviewer.agent.md" },
  { slug: "team-reviewer", family: "agents", templatePath: "sdlc/agents/team-reviewer.agent.md" },
  { slug: "e2e-sdlc-workflow", family: "skills", templatePath: "sdlc/skills/e2e-sdlc-workflow/SKILL.md" },
  { slug: "feature-specification", family: "skills", templatePath: "sdlc/skills/feature-specification/SKILL.md" },
  { slug: "implementation-plan", family: "skills", templatePath: "sdlc/skills/implementation-plan/SKILL.md" },
  { slug: "implementation-report", family: "skills", templatePath: "sdlc/skills/implementation-report/SKILL.md" },
  { slug: "review-report", family: "skills", templatePath: "sdlc/skills/review-report/SKILL.md" },
  { slug: "change-scope-control", family: "skills", templatePath: "sdlc/skills/change-scope-control/SKILL.md" },
  { slug: "test-strategy", family: "skills", templatePath: "sdlc/skills/test-strategy/SKILL.md" },
  { slug: "pr-description", family: "skills", templatePath: "sdlc/skills/pr-description/SKILL.md" },
  { slug: "full-sdlc", family: "commands", templatePath: "sdlc/commands/full-sdlc.md" },
  { slug: "specification", family: "commands", templatePath: "sdlc/commands/specification.md" },
  { slug: "implementation-plan", family: "commands", templatePath: "sdlc/commands/implementation-plan.md" },
  { slug: "implementation", family: "commands", templatePath: "sdlc/commands/implementation.md" },
  { slug: "review", family: "commands", templatePath: "sdlc/commands/review.md" },
  { slug: "ship-summary", family: "commands", templatePath: "sdlc/commands/ship-summary.md" }
];

const ARCHETYPES: ArchetypeManifest[] = [
  {
    name: "sdlc",
    description: "Base SDLC workflow: spec → plan → implement → review",
    stackLabel: "General",
    templates: BASE_SDLC_TEMPLATES
  },
  {
    name: "sdlc-java-spring",
    description: "SDLC + Java/Spring Boot stack rules (Maven, Spring Boot conventions)",
    stackLabel: "Java / Spring Boot",
    templates: [
      ...BASE_SDLC_TEMPLATES,
      { slug: "java-spring-stack", family: "rules", templatePath: "stacks/java-spring.md" }
    ]
  },
  {
    name: "sdlc-dotnet",
    description: "SDLC + .NET stack rules (dotnet CLI, C# conventions)",
    stackLabel: ".NET",
    templates: [
      ...BASE_SDLC_TEMPLATES,
      { slug: "dotnet-stack", family: "rules", templatePath: "stacks/dotnet.md" }
    ]
  },
  {
    name: "sdlc-python-flask",
    description: "SDLC + Python/Flask stack rules (pytest, Flask conventions)",
    stackLabel: "Python / Flask",
    templates: [
      ...BASE_SDLC_TEMPLATES,
      { slug: "python-flask-stack", family: "rules", templatePath: "stacks/python-flask.md" }
    ]
  },
  {
    name: "sdlc-python-fastapi",
    description: "SDLC + Python/FastAPI stack rules (pytest, FastAPI conventions)",
    stackLabel: "Python / FastAPI",
    templates: [
      ...BASE_SDLC_TEMPLATES,
      { slug: "python-fastapi-stack", family: "rules", templatePath: "stacks/python-fastapi.md" }
    ]
  }
];

export function getArchetype(name: string): ArchetypeManifest | undefined {
  return ARCHETYPES.find((a) => a.name === name);
}

export function listArchetypes(): ArchetypeManifest[] {
  return ARCHETYPES;
}
