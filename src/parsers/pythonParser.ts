import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import type { EndpointSummary } from "../types.js";
import { extractQuotedText, trimSignature, walkTree } from "./shared.js";

const parser = new Parser();
parser.setLanguage(Python);

const FASTAPI_METHODS = ["get", "post", "put", "delete", "patch", "websocket"];

function isFastApiReceiver(receiver: string): boolean {
  return receiver === "app" || receiver === "router" || receiver.endsWith("_router");
}

function isFlaskReceiver(receiver: string): boolean {
  return receiver === "app" || receiver === "bp" || receiver.endsWith("_bp") || receiver.endsWith("blueprint");
}

function matchFastApiDecorator(text: string): string | null {
  for (const method of FASTAPI_METHODS) {
    const match = text.match(new RegExp(`^@([\\w.]+)\\.${method}\\(`));
    if (match && isFastApiReceiver(match[1])) {
      return method.toUpperCase();
    }
  }

  return null;
}

function extractMethodsFromFlaskDecorator(text: string): string[] {
  const methodsMatch = text.match(/methods\s*=\s*\[([^\]]+)\]/);
  if (!methodsMatch) {
    return ["GET"];
  }

  return methodsMatch[1]
    .split(",")
    .map((value) => value.replace(/["'\s]/g, ""))
    .filter(Boolean)
    .map((value) => value.toUpperCase());
}

export function scanPythonStructure(fileContent: string): EndpointSummary[] {
  const tree = parser.parse(fileContent);
  const endpoints: EndpointSummary[] = [];

  walkTree(tree.rootNode, (node) => {
    if (node.type !== "decorated_definition") {
      return;
    }

    const functionNode = node.namedChildren.find((child) => child.type === "function_definition");
    if (!functionNode) {
      return;
    }

    const nameNode = functionNode.childForFieldName("name");
    const signature = trimSignature(functionNode.text.split(":")[0] ?? functionNode.text);

    for (const child of node.namedChildren) {
      if (child.type !== "decorator") {
        continue;
      }

      const decoratorText = child.text;
      const routePath = extractQuotedText(decoratorText) ?? "Dynamic Route";
      const fastApiMethod = matchFastApiDecorator(decoratorText);
      if (fastApiMethod) {
        endpoints.push({
          framework: "FastAPI",
          routePath,
          httpMethod: fastApiMethod,
          signature,
          sourceSymbol: nameNode?.text
        });
        continue;
      }

      const flaskRouteMatch = decoratorText.match(/^@([\w.]+)\.route\(/);
      if (flaskRouteMatch && isFlaskReceiver(flaskRouteMatch[1])) {
        const methods = extractMethodsFromFlaskDecorator(decoratorText);
        for (const method of methods) {
          endpoints.push({
            framework: "Flask",
            routePath,
            httpMethod: method,
            signature,
            sourceSymbol: nameNode?.text
          });
        }
      }
    }
  });

  return endpoints;
}