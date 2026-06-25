import Graphlib from "graphlib";
import { sanitizeName } from "./paths.js";
import type { ClusterSummary, FileSummary } from "./types.js";

const { Graph, alg } = Graphlib;

export function buildClusters(files: FileSummary[]): ClusterSummary[] {
  const graph = new Graph({ directed: true });

  for (const file of files) {
    graph.setNode(file.filePath, file);
  }

  for (const file of files) {
    for (const dependency of file.dependencies) {
      if (graph.hasNode(dependency)) {
        graph.setEdge(file.filePath, dependency);
      }
    }
  }

  const components = alg.components(graph)
    .map((component) => component.slice().sort((left, right) => left.localeCompare(right)))
    .sort((left, right) => left[0].localeCompare(right[0]));

  return components.map((component) => ({
    name: sanitizeName(component[0].replace(/\.[^.]+$/, "")) || "root-cluster",
    files: component,
    endpointCount: component.reduce((count, filePath) => {
      const file = files.find((entry) => entry.filePath === filePath);
      return count + (file?.endpoints.length ?? 0);
    }, 0)
  }));
}