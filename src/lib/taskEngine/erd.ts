/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TaskData } from "@/lib/db";

export function generateERDTasks(
  nodeId: string,
  projectId: string,
  fields: Record<string, any>,
): Omit<TaskData, "id" | "created_at" | "updated_at">[] {
  const tasks: Omit<TaskData, "id" | "created_at" | "updated_at">[] = [];
  const entities = (fields.entities as any[]) || [];
  const rels = (fields.relationships as any[]) || [];
  let order = 0;

  entities.forEach((entity: any) => {
    if (!entity.name) return;
    
    // Migration task
    tasks.push({
      project_id: projectId,
      source_node_id: nodeId,
      source_item_id: `erd-migration-${entity.name.toLowerCase()}`,
      title: `Create ${entity.name} migration + model`,
      description: `Database schema implementation for ${entity.name} entity.`,
      group_key: "Database",
      feature_name: "Database Schema",
      priority_tier: "P0",
      priority: "Must",
      labels: ["database"],
      status: "todo",
      is_manual: false,
      sort_order: order++,
    });

    // Validation task if 5+ attributes
    if ((entity.attributes || []).length >= 5) {
      tasks.push({
        project_id: projectId,
        source_node_id: nodeId,
        source_item_id: `erd-validation-${entity.name.toLowerCase()}`,
        title: `Add validations for ${entity.name}`,
        description: `${entity.name} has ${entity.attributes.length} attributes — add input validation rules.`,
        group_key: "Database",
        feature_name: "Database Schema",
        priority_tier: "P1",
        priority: "Should",
        labels: ["database"],
        status: "todo",
        is_manual: false,
        sort_order: order++,
      });
    }

    // Seed data task
    tasks.push({
      project_id: projectId,
      source_node_id: nodeId,
      source_item_id: `erd-seed-${entity.name.toLowerCase()}`,
      title: `Create seed data for ${entity.name}`,
      description: `Generate sample/seed data for ${entity.name} entity.`,
      group_key: "Database",
      feature_name: "Quality & Performance",
      priority_tier: "P2",
      priority: "Could",
      labels: ["database"],
      status: "todo",
      is_manual: false,
      sort_order: order++,
    });
  });

  // Relationship tasks
  rels.forEach((rel: any) => {
    if (!rel.from || !rel.to) return;
    tasks.push({
      project_id: projectId,
      source_node_id: nodeId,
      source_item_id: `erd-rel-${rel.from.toLowerCase()}-${rel.to.toLowerCase()}`,
      title: `Setup ${rel.from} ↔ ${rel.to} relationship`,
      description: `Configure ${rel.type || "one-to-many"} relationship between ${rel.from} and ${rel.to}.`,
      group_key: "Database",
      feature_name: "Database Schema",
      priority_tier: "P0",
      priority: "Must",
      labels: ["database"],
      status: "todo",
      is_manual: false,
      sort_order: order++,
    });

    // N:M pivot table task
    if (rel.type === "many-to-many") {
      const junction = rel.junction_table || `${rel.from}_${rel.to}`;
      tasks.push({
        project_id: projectId,
        source_node_id: nodeId,
        source_item_id: `erd-pivot-${rel.from.toLowerCase()}-${rel.to.toLowerCase()}`,
        title: `Create ${junction} pivot table`,
        description: `N:M junction table for ${rel.from} ↔ ${rel.to}.`,
        group_key: "Database",
        feature_name: "Database Schema",
        priority_tier: "P0",
        priority: "Must",
        labels: ["database"],
        status: "todo",
        is_manual: false,
        sort_order: order++,
      });
    }
  });

  return tasks;
}
