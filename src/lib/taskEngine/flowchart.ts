/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TaskData } from "@/lib/db";
import { mapPriorityToTier } from "./utils";

export function generateFlowchartTasks(
  nodeId: string,
  projectId: string,
  fields: Record<string, any>,
): Omit<TaskData, "id" | "created_at" | "updated_at">[] {
  const tasks: Omit<TaskData, "id" | "created_at" | "updated_at">[] = [];
  
  // Support new multi-flow format and legacy flat format
  const flows = (fields.flows as any[]) || [];
  const legacySteps = (fields.steps as any[]) || [];
  let order = 0;

  const processSteps = (steps: any[], featureName: string) => {
    steps.forEach((s: any) => {
      if (!s.label || s.type === "start" || s.type === "end") return;
      const isDecision = s.type === "decision";
      
      tasks.push({
        project_id: projectId,
        source_node_id: nodeId,
        source_item_id: `flowchart-step-${order}-${s.label.toLowerCase().replace(/\s+/g, "-")}`,
        title: isDecision ? `Validate: ${s.label}` : s.label,
        description: isDecision
          ? `Implement branching logic for: ${s.label}`
          : `Implement process: ${s.label}`,
        group_key: "Logic",
        feature_name: featureName,
        priority_tier: "P0",
        priority: "Must",
        labels: isDecision ? ["backend"] : ["backend", "frontend"],
        status: "todo",
        is_manual: false,
        sort_order: order++,
      });
    });
  };

  if (flows.length > 0) {
    flows.forEach((flow: any) => processSteps(flow.steps || [], flow.name || "Business Logic"));
  } else {
    processSteps(legacySteps, "Business Logic");
  }

  return tasks;
}
