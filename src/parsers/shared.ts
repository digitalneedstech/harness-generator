import type { SyntaxNode } from "tree-sitter";

export function walkTree(node: SyntaxNode, visitor: (node: SyntaxNode) => void): void {
  visitor(node);
  for (const child of node.namedChildren) {
    walkTree(child, visitor);
  }
}

export function extractQuotedText(input: string): string | null {
  const match = input.match(/["']([^"']+)["']/);
  return match ? match[1] : null;
}

export function trimSignature(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}