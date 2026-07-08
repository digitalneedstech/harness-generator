import fs from "node:fs";
import path from "node:path";

export interface ProjectSignals {
  projectName: string;
  testCommand: string;
  buildCommand: string;
}

const TODO_NAME = "# TODO: replace with your project name";
const TODO_TEST = "# TODO: replace with your test command";
const TODO_BUILD = "# TODO: replace with your build command";

export function scanProjectSignals(projectRoot: string): ProjectSignals {
  const pomPath = path.join(projectRoot, "pom.xml");
  if (fs.existsSync(pomPath)) {
    const pom = fs.readFileSync(pomPath, "utf8");
    const match = pom.match(/<artifactId>([^<]+)<\/artifactId>/);
    return {
      projectName: match?.[1] ?? TODO_NAME,
      testCommand: "./mvnw test",
      buildCommand: "./mvnw package -DskipTests"
    };
  }

  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: unknown };
      return {
        projectName: typeof pkg.name === "string" ? pkg.name : TODO_NAME,
        testCommand: "npm test",
        buildCommand: "npm run build"
      };
    } catch {
      // fall through to next detector
    }
  }

  const pyprojectPath = path.join(projectRoot, "pyproject.toml");
  if (fs.existsSync(pyprojectPath)) {
    const toml = fs.readFileSync(pyprojectPath, "utf8");
    const match = toml.match(/^\s*name\s*=\s*"([^"]+)"/m);
    return {
      projectName: match?.[1] ?? TODO_NAME,
      testCommand: "python -m pytest",
      buildCommand: "python -m build"
    };
  }

  const requirementsPath = path.join(projectRoot, "requirements.txt");
  if (fs.existsSync(requirementsPath)) {
    return {
      projectName: path.basename(projectRoot),
      testCommand: "python -m pytest",
      buildCommand: "python -m build"
    };
  }

  const entries = fs.readdirSync(projectRoot);
  const csproj = entries.find((f) => f.endsWith(".csproj"));
  if (csproj) {
    return {
      projectName: csproj.slice(0, -".csproj".length),
      testCommand: "dotnet test",
      buildCommand: "dotnet build"
    };
  }

  return {
    projectName: path.basename(projectRoot),
    testCommand: TODO_TEST,
    buildCommand: TODO_BUILD
  };
}
