import type { OrgConfig, WikiFile } from "../types.js";
import { getFixedWikiTemplates, getDynamicWikiTemplate } from "./templates.js";
import fs from "node:fs";
import path from "node:path";

export function generateWikis(orgConfig: OrgConfig): WikiFile[] {
  const wikis: WikiFile[] = [];

  // Add fixed wikis
  const fixedWikis = getFixedWikiTemplates();
  wikis.push(...fixedWikis);

  // Add dynamic wikis from custom policies
  const customPolicies = orgConfig.policies?.custom || [];
  for (const policy of customPolicies) {
    const wikiFile = getDynamicWikiTemplate(policy.policy_name, policy.wiki_file);
    wikis.push(wikiFile);
  }

  return wikis;
}

export function writeWikis(outputDir: string, wikis: WikiFile[]): string[] {
  const writtenPaths: string[] = [];
  const wikiDir = path.join(outputDir, "wiki");

  // Create wiki directory if it doesn't exist
  if (!fs.existsSync(wikiDir)) {
    fs.mkdirSync(wikiDir, { recursive: true });
  }

  for (const wiki of wikis) {
    const filePath = path.join(wikiDir, wiki.filename);
    fs.writeFileSync(filePath, wiki.content, "utf-8");
    writtenPaths.push(filePath);
  }

  return writtenPaths;
}

export function wikiFileToLoadInstruction(wiki: WikiFile): string {
  return `### ${wiki.title}
When: ${wiki.description}
→ Load: \`wiki/${wiki.filename}\``;
}
