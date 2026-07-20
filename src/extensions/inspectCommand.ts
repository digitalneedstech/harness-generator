import { Command } from "commander";
import { analyzeRepository } from "../analyzer.js";
import { loadOrgConfigIfExists } from "../orgconfig/loader.js";
import { assignTier, computeScopes } from "./providers.js";

function findCluster(name: string | undefined, clusters: Awaited<ReturnType<typeof analyzeRepository>>["clusters"]) {
  if (!name) return undefined;
  const cluster = clusters.find((item) => item.name === name);
  if (!cluster) throw new Error(`Unknown cluster: ${name}`);
  return cluster;
}

export function buildPermissionsCommand(): Command {
  const command = new Command("permissions").description("Inspect computed extension permission scopes");
  command.command("scope")
    .option("-t, --target <path>", "Target repository path", process.cwd())
    .option("--cluster <name>", "Inspect one cluster")
    .option("--org-config <path>", "Optional organization configuration")
    .action(async (options) => {
      const scan = await analyzeRepository(options.target);
      const orgConfig = options.orgConfig ? loadOrgConfigIfExists(options.orgConfig) : null;
      const clusters = findCluster(options.cluster, scan.clusters) ? [findCluster(options.cluster, scan.clusters)!] : scan.clusters;
      console.log(JSON.stringify(Object.fromEntries(clusters.map((cluster) => [cluster.name, computeScopes(cluster, scan, orgConfig?.policies?.permissions?.deny ?? [])])), null, 2));
    });
  return command;
}

export function buildCostCommand(): Command {
  const command = new Command("cost").description("Inspect cost-policy model tier suggestions");
  command.command("analyze")
    .option("-t, --target <path>", "Target repository path", process.cwd())
    .option("--cluster <name>", "Inspect one cluster")
    .option("--explain", "Include classification reasons", false)
    .action(async (options) => {
      const scan = await analyzeRepository(options.target);
      const clusters = findCluster(options.cluster, scan.clusters) ? [findCluster(options.cluster, scan.clusters)!] : scan.clusters;
      for (const cluster of clusters) {
        const suggestion = assignTier(cluster, scan);
        console.log(options.explain ? suggestion.explanation : `${cluster.name}: ${suggestion.tier}`);
      }
    });
  return command;
}
