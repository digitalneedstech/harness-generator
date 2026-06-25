import path from "node:path";
import Parser from "tree-sitter";
import TypeScriptGrammar from "tree-sitter-typescript";
import type { EndpointSummary } from "../types.js";
import { normalizePath } from "../paths.js";
import { trimSignature, walkTree } from "./shared.js";

const { tsx, typescript } = TypeScriptGrammar;

const METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]);
const EXPRESS_METHODS = new Set(["get", "post", "put", "delete", "patch", "use"]);

function isExpressReceiver(receiver: string): boolean {
  return receiver === "app" || receiver === "router" || receiver.endsWith("Router");
}

function createParser(language: Parameters<Parser["setLanguage"]>[0]): Parser {
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}

const tsParser = createParser(typescript);
const tsxParser = createParser(tsx);

type ParseOnlyParser = Pick<Parser, "parse">;

function inferNextRoutePath(filePath: string): string {
  const normalized = normalizePath(filePath);
  const appIndex = normalized.lastIndexOf("/app/");
  const normalizeAppRoute = (value: string): string => {
    const withoutGroups = value
      .split("/")
      .filter((segment) => segment.length > 0 && !/^\(.+\)$/.test(segment))
      .join("/");
    return `/${withoutGroups}`.replace(/\/+/g, "/");
  };

  if (appIndex >= 0) {
    const appRelative = normalized.slice(appIndex + 5).replace(/\/route\.(ts|tsx)$/, "");
    return normalizeAppRoute(appRelative);
  }

  const withoutFile = normalized.replace(/\/route\.(ts|tsx)$/, "");
  return normalizeAppRoute(withoutFile);
}

function scanNextRouteHandlersFromRegex(fileContent: string, routePath: string): EndpointSummary[] {
  const endpoints: EndpointSummary[] = [];

  for (const match of fileContent.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(/g)) {
    endpoints.push({
      framework: "Next.js",
      routePath,
      httpMethod: match[1],
      signature: `Exported HTTP Handler: ${match[1]}()`,
      sourceSymbol: match[1]
    });
  }

  for (const match of fileContent.matchAll(/export\s+const\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*=\s*/g)) {
    endpoints.push({
      framework: "Next.js",
      routePath,
      httpMethod: match[1],
      signature: `Exported HTTP Handler: ${match[1]}()`,
      sourceSymbol: match[1]
    });
  }

  return endpoints;
}

function scanExpressRoutesFromRegex(fileContent: string): EndpointSummary[] {
  const endpoints: EndpointSummary[] = [];
  const routePattern = /\b(app|router|[A-Za-z_$][\w$]*Router)\.(get|post|put|delete|patch|use)\s*\(\s*(["'])((?:\\.|(?!\3).)*)\3/gs;

  for (const match of fileContent.matchAll(routePattern)) {
    endpoints.push({
      framework: "Express",
      routePath: match[4],
      httpMethod: match[2].toUpperCase(),
      signature: `Express Signature: ${trimSignature(match[0].split("\n")[0] ?? match[0])}`
    });
  }

  return endpoints;
}

export function scanTSStructure(filePath: string, fileContent: string, parserOverride?: ParseOnlyParser): EndpointSummary[] {
  const parser = parserOverride ?? (filePath.endsWith(".tsx") ? tsxParser : tsParser);
  let tree: Parser.Tree | null = null;

  try {
    tree = parser.parse(fileContent);
  } catch {
    tree = null;
  }

  const fileName = path.basename(filePath);
  const endpoints: EndpointSummary[] = [];

  if (fileName === "route.ts" || fileName === "route.tsx") {
    const routePath = inferNextRoutePath(filePath);

    if (tree) {
      walkTree(tree.rootNode, (node) => {
        if (node.type !== "function_declaration") {
          return;
        }

        const nameNode = node.childForFieldName("name");
        if (!nameNode || !METHODS.has(nameNode.text)) {
          return;
        }

        if (!node.text.includes("export")) {
          return;
        }

        endpoints.push({
          framework: "Next.js",
          routePath,
          httpMethod: nameNode.text,
          signature: `Exported HTTP Handler: ${nameNode.text}()`,
          sourceSymbol: nameNode.text
        });
      });
    }

    if (endpoints.length === 0) {
      return scanNextRouteHandlersFromRegex(fileContent, routePath);
    }

    return endpoints;
  }

  if (!tree) {
    return scanExpressRoutesFromRegex(fileContent);
  }

  walkTree(tree.rootNode, (node) => {
    if (node.type !== "call_expression") {
      return;
    }

    const functionNode = node.childForFieldName("function");
    if (!functionNode || functionNode.type !== "member_expression") {
      return;
    }

    const objectNode = functionNode.childForFieldName("object");
    if (!objectNode || !isExpressReceiver(objectNode.text)) {
      return;
    }

    const propertyNode = functionNode.childForFieldName("property");
    if (!propertyNode || !EXPRESS_METHODS.has(propertyNode.text)) {
      return;
    }

    const argumentsNode = node.childForFieldName("arguments");
    const firstArg = argumentsNode?.namedChildren[0];
    const routePath = firstArg?.type === "string"
      ? firstArg.text.replace(/["']/g, "")
      : "Dynamic Route";

    endpoints.push({
      framework: "Express",
      routePath,
      httpMethod: propertyNode.text.toUpperCase(),
      signature: `Express Signature: ${trimSignature(node.text.split("\n")[0] ?? node.text)}`
    });
  });

  return endpoints;
}