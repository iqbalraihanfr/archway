/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TaskData } from "@/lib/db";
import { mapPriorityToTier } from "./utils";

export function generateUserStoriesTasks(
  nodeId: string,
  projectId: string,
  fields: Record<string, any>,
): Omit<TaskData, "id" | "created_at" | "updated_at">[] {
  const tasks: Omit<TaskData, "id" | "created_at" | "updated_at">[] = [];
  const items = (fields.items as any[]) || [];
  let order = 0;

  items.forEach((item: any, index: number) => {
    if (!item.goal) return;
    
    // Implementation task per US
    tasks.push({
      project_id: projectId,
      source_node_id: nodeId,
      source_item_id: `story-${index}-impl`,
      title: `Implement: ${item.goal}`,
      description: `As a ${item.role || "user"}, I want to ${item.goal} so that ${item.benefit || "it works"}`,
      group_key: "Feature",
      feature_name: item.category || "General",
      priority_tier: mapPriorityToTier(item.priority),
      priority: item.priority || "Should",
      labels: ["feature"],
      status: "todo",
      is_manual: false,
      sort_order: order++,
    });

    // Test task per acceptance criterion (Given/When/Then)
    const criteria = item.acceptance_criteria || [];
    criteria.forEach((ac: any, acIdx: number) => {
      const isStructured = typeof ac === "object" && ac !== null;
      const given = isStructured ? ac.given || "" : ac || "";
      const when = isStructured ? ac.when || "" : "";
      const then = isStructured ? ac.then || "" : "";
      if (!given && !when && !then) return;

      tasks.push({
        project_id: projectId,
        source_node_id: nodeId,
        source_item_id: `story-${index}-ac-${acIdx}`,
        title: `Test: Given ${given}, When ${when}, Then ${then}`,
        description: `Acceptance test for US-${String(index + 1).padStart(3, "0")} AC-${acIdx + 1}`,
        group_key: "Testing",
        feature_name: "Quality & Performance",
        priority_tier: mapPriorityToTier(item.priority),
        priority: item.priority || "Should",
        labels: ["testing"],
        status: "todo",
        is_manual: false,
        sort_order: order++,
      });
    });
  });

  return tasks;
}
