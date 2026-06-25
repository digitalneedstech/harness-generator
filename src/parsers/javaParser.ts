import Parser from "tree-sitter";
import Java from "tree-sitter-java";
import type { EndpointSummary } from "../types.js";
import { extractQuotedText, trimSignature, walkTree } from "./shared.js";

const parser = new Parser();
parser.setLanguage(Java);

const JAVA_METHODS: Array<[string, string]> = [
  ["GetMapping", "GET"],
  ["PostMapping", "POST"],
  ["PutMapping", "PUT"],
  ["DeleteMapping", "DELETE"],
  ["PatchMapping", "PATCH"],
  ["RequestMapping", "REQUEST"]
];

function joinRouteSegments(prefix: string | null, routePath: string): string {
  if (!prefix) {
    return routePath;
  }

  const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const normalizedPath = routePath.startsWith("/") ? routePath : `/${routePath}`;

  if (routePath === "Dynamic Route") {
    return normalizedPrefix || "/";
  }

  if (!normalizedPrefix) {
    return normalizedPath;
  }

  return `${normalizedPrefix}${normalizedPath}`.replace(/\/+/g, "/");
}

function resolveJavaHttpMethod(annotationText: string, defaultMethod: string): string {
  if (defaultMethod !== "REQUEST") {
    return defaultMethod;
  }

  const requestMethod = annotationText.match(/RequestMethod\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/)?.[1];
  return requestMethod ?? defaultMethod;
}

function findMethodDeclarationAncestor(node: Parser.SyntaxNode | null): Parser.SyntaxNode | null {
  let current = node?.parent ?? null;
  while (current) {
    if (current.type === "method_declaration") {
      return current;
    }
    current = current.parent;
  }

  return null;
}

export function scanJavaStructure(fileContent: string): EndpointSummary[] {
  const tree = parser.parse(fileContent);
  const endpoints: EndpointSummary[] = [];
  const classRoutePrefix = fileContent.match(/@RequestMapping\((?:[^)]*value\s*=\s*)?["']([^"']+)["'][^)]*\)\s*(?:public\s+)?(?:abstract\s+|final\s+)?class\s+/m)?.[1]
    ?? fileContent.match(/@RequestMapping\(["']([^"']+)["']\)\s*(?:public\s+)?(?:abstract\s+|final\s+)?class\s+/m)?.[1]
    ?? null;

  walkTree(tree.rootNode, (node) => {
    if (node.type !== "annotation") {
      return;
    }

    const annotationText = node.text;
    const match = JAVA_METHODS.find(([name]) => annotationText.startsWith(`@${name}`));
    if (!match) {
      return;
    }

    const methodNode = findMethodDeclarationAncestor(node);
    if (!methodNode) {
      return;
    }

    const routePath = extractQuotedText(annotationText) ?? "Dynamic Route";
    const signature = methodNode
      ? trimSignature(methodNode.text.split("{")[0] ?? methodNode.text)
      : "Java Method Handler";

    endpoints.push({
      framework: "Spring Boot",
      routePath: joinRouteSegments(classRoutePrefix, routePath),
      httpMethod: resolveJavaHttpMethod(annotationText, match[1]),
      signature
    });
  });

  return endpoints;
}