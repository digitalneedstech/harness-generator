import fs from "node:fs";
import type { OrgConfig } from "../types.js";

function parseYaml(content: string): Record<string, unknown> {
  const lines = content.split("\n");
  const result: Record<string, unknown> = {};
  const stack: Array<{
    indent: number;
    key: string;
    value: Record<string, unknown> | Array<Record<string, unknown>>;
    isArray: boolean;
    currentArrayItem?: Record<string, unknown>;
  }> = [{ indent: -1, key: "root", value: result, isArray: false }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const indent = line.length - line.trimStart().length;

    // Handle array items (lines starting with -)
    if (trimmed.startsWith("- ")) {
      const parent = stack[stack.length - 1]!;
      if (!parent.isArray) {
        throw new Error(`Unexpected array item at line ${i + 1}`);
      }
      const array = parent.value as Array<Record<string, unknown>>;
      const itemStr = trimmed.substring(2).trim();

      // Parse inline object
      if (itemStr.includes(":")) {
        const colonIndex = itemStr.indexOf(":");
        const key = itemStr.substring(0, colonIndex).trim();
        const valueStr = itemStr.substring(colonIndex + 1).trim();
        const obj: Record<string, unknown> = {};
        obj[key] = parseValue(valueStr);
        array.push(obj);
        parent.currentArrayItem = obj;
      }
      continue;
    }

    // Pop stack until we find the right level
    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    // Parse key: value
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, colonIndex).trim();
    const valueStr = trimmed.substring(colonIndex + 1).trim();

    // Check if we should add to current array item
    const parent = stack[stack.length - 1]!;
    if (parent.isArray && parent.currentArrayItem && indent > parent.indent) {
      // Add to current array item
      if (valueStr === "") {
        const obj: Record<string, unknown> = {};
        parent.currentArrayItem[key] = obj;
        stack.push({ indent, key, value: obj, isArray: false });
      } else {
        parent.currentArrayItem[key] = parseValue(valueStr);
      }
      continue;
    }

    const parentValue = parent.value;
    if (typeof parentValue === "string" || typeof parentValue === "number" || typeof parentValue === "boolean") {
      throw new Error(`Cannot set property on non-object at line ${i + 1}`);
    }

    if (Array.isArray(parentValue) && !parent.currentArrayItem) {
      throw new Error(`Cannot set property on array at line ${i + 1}`);
    }

    // Get the actual parent object (could be array item)
    const targetObject = parent.isArray && parent.currentArrayItem ? parent.currentArrayItem : parentValue;

    if (typeof targetObject !== "object" || targetObject === null || Array.isArray(targetObject)) {
      throw new Error(`Cannot set property on non-object at line ${i + 1}`);
    }

    if (valueStr === "") {
      // Check if next line is an array item
      const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
      const nextTrimmed = nextLine.trim();

      if (nextTrimmed.startsWith("- ")) {
        // Array value
        const arr: Array<Record<string, unknown>> = [];
        targetObject[key] = arr;
        stack.push({ indent, key, value: arr, isArray: true, currentArrayItem: undefined });
      } else {
        // Object value
        const obj: Record<string, unknown> = {};
        targetObject[key] = obj;
        stack.push({ indent, key, value: obj, isArray: false });
      }
    } else {
      targetObject[key] = parseValue(valueStr);
    }
  }

  return result;
}

function parseValue(valueStr: string): unknown {
  if (valueStr === "true") {
    return true;
  }
  if (valueStr === "false") {
    return false;
  }
  if (valueStr === "null") {
    return null;
  }
  if (/^-?\d+$/.test(valueStr)) {
    return parseInt(valueStr, 10);
  }
  if (/^-?\d+\.\d+$/.test(valueStr)) {
    return parseFloat(valueStr);
  }
  if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
    return valueStr.slice(1, -1);
  }
  if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
    return valueStr.slice(1, -1);
  }
  return valueStr;
}

export function loadOrgConfig(filePath: string): OrgConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Org config file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = parseYaml(content);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Org config must be a valid YAML object");
  }

  return parsed as OrgConfig;
}

export function loadOrgConfigIfExists(filePath: string): OrgConfig | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return loadOrgConfig(filePath);
}
