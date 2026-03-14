/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TaskData } from "@/lib/db";
import { mapPriorityToTier } from "./utils";

export function generateRequirementTasks(
  nodeId: string,
  projectId: string,
  fields: Record<string, any>,
): Omit<TaskData, "id" | "created_at" | "updated_at">[] {
  const tasks: Omit<TaskData, "id" | "created_at" | "updated_at">[] = [];
  const items = (fields.items as any[]) || [];
  let order = 0;

  // Group items by category to define "Features"
  const featureGroups: Record<string, any[]> = {};
  items.forEach((item) => {
    if ((item.type || "FR") !== "FR") return;
    const cat = item.category || "General";
    if (!featureGroups[cat]) featureGroups[cat] = [];
    featureGroups[cat].push(item);
  });

  // Create tasks per feature
  Object.entries(featureGroups).forEach(([featureName, featureItems]) => {
    // 1. Feature Core Implementation Task
    const topPriority = featureItems.reduce((prev, curr) => {
      const pMap: Record<string, number> = { Must: 0, Should: 1, Could: 2, Wont: 3 };
      return (pMap[curr.priority] ?? 1) < (pMap[prev.priority] ?? 1) ? curr : prev;
    }, featureItems[0]);

    const tier = mapPriorityToTier(topPriority.priority);

    // DoD for this feature based on all FRs in it
    const dod = featureItems.map(i => ({ text: i.description, done: false }));

    tasks.push({
      project_id: projectId,
      source_node_id: nodeId,
      source_item_id: `feature-${featureName.toLowerCase().replace(/\s+/g, "-")}`,
      title: `${featureName}: Core Implementation`,
      description: `Implementation of the ${featureName} feature covering ${featureItems.length} requirements.`,
      group_key: "Feature",
      feature_name: featureName,
      priority_tier: tier,
      dod_items: dod,
      priority: topPriority.priority || "Should",
      labels: ["feature"],
      status: "todo",
      is_manual: false,
      sort_order: order++,
    });

    // 2. Individual tasks for complex FRs
    featureItems.forEach((item, idx) => {
      if (item.description.length > 100) {
        tasks.push({
          project_id: projectId,
          source_node_id: nodeId,
          source_item_id: `fr-${item.id || idx}`,
          title: `Detail: ${item.description.slice(0, 50)}...`,
          description: item.description,
          group_key: "Logic",
          feature_name: featureName,
          priority_tier: mapPriorityToTier(item.priority),
          priority: item.priority || "Should",
          labels: ["logic"],
          status: "todo",
          is_manual: false,
          sort_order: order++,
        });
      }
    });
  });

  // NFR tasks
  const nfrs = items.filter(i => i.type === "NFR");
  nfrs.forEach((nfr, idx) => {
    tasks.push({
      project_id: projectId,
      source_node_id: nodeId,
      source_item_id: `nfr-${nfr.id || idx}`,
      title: `Quality: ${nfr.category || "Performance"} - ${nfr.metric || "Goal"}`,
      description: `${nfr.description}\nTarget: ${nfr.target || "N/A"}`,
      group_key: "Quality",
      feature_name: "Quality & Performance",
      priority_tier: mapPriorityToTier(nfr.priority),
      priority: nfr.priority || "Should",
      labels: ["quality"],
      status: "todo",
      is_manual: false,
      sort_order: order++,
    });
  });

  return tasks;
}
