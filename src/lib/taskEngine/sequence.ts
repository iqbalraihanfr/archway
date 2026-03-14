/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TaskData } from "@/lib/db";
import { mapPriorityToTier } from "./utils";

export function generateSequenceTasks(
  nodeId: string,
  projectId: string,
  fields: Record<string, any>,
): Omit<TaskData, "id" | "created_at" | "updated_at">[] {
  const tasks: Omit<TaskData, "id" | "created_at" | "updated_at">[] = [];
  const participants = (fields.participants as any[]) || [];
  const messages = (fields.messages as any[]) || [];
  let order = 0;
  const seenServices = new Set<string>();
  const seenAltGroups = new Set<string>();

  // Service participant → module task
  participants.forEach((p: any) => {
    const name = typeof p === "string" ? p : p?.name || "";
    const type = typeof p === "string" ? "component" : p?.type || "component";
    
    if (type === "service" && name && !seenServices.has(name)) {
      seenServices.add(name);
      tasks.push({
        project_id: projectId,
        source_node_id: nodeId,
        source_item_id: `seq-service-${name.toLowerCase().replace(/\s+/g, "-")}`,
        title: `Setup ${name} module`,
        description: `Initialize and configure the ${name} service module.`,
        group_key: "Backend",
        feature_name: "API & Infrastructure",
        priority_tier: "P0",
        priority: "Must",
        labels: ["backend"],
        status: "todo",
        is_manual: false,
        sort_order: order++,
      });
    }
  });

  messages.forEach((msg: any, msgIdx: number) => {
    const content = msg.content || "";
    if (!content) return;

    // HTTP messages → API endpoint task
    const httpMatch = content.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)/i);
    if (httpMatch || /\/api\//.test(content)) {
      const method = httpMatch ? httpMatch[1].toUpperCase() : "API";
      const endpoint = httpMatch ? httpMatch[2] : content;
      
      tasks.push({
        project_id: projectId,
        source_node_id: nodeId,
        source_item_id: `seq-api-${msgIdx}-${content.toLowerCase().replace(/\s+/g, "-").substring(0, 30)}`,
        title: `Create ${method} ${endpoint}`,
        description: `API endpoint: ${content} (${msg.from} → ${msg.to})`,
        group_key: "API",
        feature_name: "API & Infrastructure",
        priority_tier: "P0",
        priority: "Must",
        labels: ["backend"],
        status: "todo",
        is_manual: false,
        sort_order: order++,
      });
    } else {
      // Generic message task
      tasks.push({
        project_id: projectId,
        source_node_id: nodeId,
        source_item_id: `seq-msg-${msgIdx}`,
        title: `Implement: ${content}`,
        description: `Integration: ${msg.from} → ${msg.to}: ${content}`,
        group_key: "Logic",
        feature_name: "API & Infrastructure",
        priority_tier: "P1",
        priority: "Should",
        labels: ["backend"],
        status: "todo",
        is_manual: false,
        sort_order: order++,
      });
    }

    // Alt/opt/loop group → error handling task
    const group = msg.group || "none";
    const groupLabel = msg.group_label || group;
    if (group === "alt" && groupLabel && !seenAltGroups.has(groupLabel)) {
      seenAltGroups.add(groupLabel);
      tasks.push({
        project_id: projectId,
        source_node_id: nodeId,
        source_item_id: `seq-alt-${groupLabel.toLowerCase().replace(/\s+/g, "-")}`,
        title: `Handle: ${groupLabel} error case`,
        description: `Error handling for alternative flow: ${groupLabel}`,
        group_key: "Quality",
        feature_name: "Quality & Performance",
        priority_tier: "P1",
        priority: "Should",
        labels: ["backend"],
        status: "todo",
        is_manual: false,
        sort_order: order++,
      });
    }
  });

  return tasks;
}
