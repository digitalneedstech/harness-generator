import test from "node:test";
import assert from "node:assert/strict";
import { scanJavaStructure } from "../parsers/javaParser.js";
import { scanPythonStructure } from "../parsers/pythonParser.js";
import { scanTSStructure } from "../parsers/tsParser.js";

test("scanTSStructure detects Next.js handlers", () => {
  const content = `
export async function GET() {
  return Response.json({ ok: true });
}

export const POST = async () => {
  return Response.json({ ok: true });
}
`;

  const endpoints = scanTSStructure("src/app/api/users/route.ts", content);
  assert.equal(endpoints.length, 2);
  assert.equal(endpoints[0]?.framework, "Next.js");
  assert.equal(endpoints[0]?.routePath, "/api/users");
});

test("scanTSStructure strips Next.js route groups from route paths", () => {
  const content = `
export async function GET() {
  return Response.json({ ok: true });
}
`;

  const endpoints = scanTSStructure("src/app/(admin)/users/route.ts", content);
  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0]?.routePath, "/users");
});

test("scanTSStructure detects Express routes", () => {
  const content = `
app.get('/health', healthHandler)
router.post('/users', createUser)
router.use('/internal', internalRouter)
`;

  const endpoints = scanTSStructure("src/server/routes.ts", content);
  assert.equal(endpoints.length, 3);
  assert.equal(endpoints[0]?.routePath, "/health");
  assert.equal(endpoints[1]?.httpMethod, "POST");
  assert.equal(endpoints[2]?.httpMethod, "USE");
});

test("scanTSStructure ignores non-Express member calls", () => {
  const content = `
cache.get('/health')
client.post('/users')
`;

  const endpoints = scanTSStructure("src/server/not-routes.ts", content);
  assert.equal(endpoints.length, 0);
});

test("scanTSStructure falls back to regex when TS route parsing throws", () => {
  const content = `
export async function GET() {
  return Response.json({ ok: true });
}
`;

  const endpoints = scanTSStructure("src/app/api/status/route.ts", content, {
    parse() {
      throw new Error("synthetic parse failure");
    }
  });

  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0]?.framework, "Next.js");
  assert.equal(endpoints[0]?.routePath, "/api/status");
});

test("scanTSStructure falls back to regex when Express parsing throws", () => {
  const content = `
router.post('/users', createUser)
`;

  const endpoints = scanTSStructure("src/server/routes.ts", content, {
    parse() {
      throw new Error("synthetic parse failure");
    }
  });

  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0]?.framework, "Express");
  assert.equal(endpoints[0]?.routePath, "/users");
  assert.equal(endpoints[0]?.httpMethod, "POST");
});

test("scanJavaStructure detects Spring mappings", () => {
  const content = `
package com.example;

class UserController {
  @GetMapping("/users")
  public List<String> users() {
    return List.of();
  }
}
`;

  const endpoints = scanJavaStructure(content);
  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0]?.framework, "Spring Boot");
  assert.equal(endpoints[0]?.httpMethod, "GET");
});

test("scanJavaStructure resolves RequestMapping methods", () => {
  const content = `
@RequestMapping("/api")
class UserController {
  @RequestMapping(value = "/users", method = RequestMethod.POST)
  public String createUser() {
    return "ok";
  }
}
`;

  const endpoints = scanJavaStructure(content);
  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0]?.httpMethod, "POST");
  assert.equal(endpoints[0]?.routePath, "/api/users");
});

test("scanPythonStructure detects FastAPI and Flask routes", () => {
  const content = `
@router.get("/healthz")
async def healthz():
    return {"status": "ok"}

@agent_bp.route('/summarize_cv_job', methods=['POST'])
def summarize_cv_job_endpoint():
    return {}
`;

  const endpoints = scanPythonStructure(content);
  assert.equal(endpoints.length, 2);
  assert.equal(endpoints[0]?.framework, "FastAPI");
  assert.equal(endpoints[1]?.framework, "Flask");
  assert.equal(endpoints[1]?.httpMethod, "POST");
});

test("scanPythonStructure ignores non-framework decorators", () => {
  const content = `
@client.get("/status")
def client_status():
    return {}

@worker.route('/tasks')
def route_task():
    return {}
`;

  const endpoints = scanPythonStructure(content);
  assert.equal(endpoints.length, 0);
});