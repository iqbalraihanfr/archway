/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeData, NodeContent, TaskData } from "@/lib/db";

/**
 * Parses node contents deterministically from structured_fields
 * Returns an array of tasks with unique source_item_id properties to enable state-merging.
 */
export function generateTasksFromNode(
  node: NodeData,
  content: NodeContent | null,
  projectId: string,
): Omit<TaskData, "id" | "created_at" | "updated_at">[] {
  if (!content || !content.structured_fields) return [];

  const tasks: Omit<TaskData, "id" | "created_at" | "updated_at">[] = [];
  const fields = content.structured_fields as Record<string, any>;

  switch (node.type) {
    case "user_stories": {
      const items = (fields.items as any[]) || [];
      let order = 0;
      items.forEach((item: any, index: number) => {
        if (!item.goal) return;
        // Implementation task per US
        tasks.push({
          project_id: projectId,
          source_node_id: node.id,
          source_item_id: `story-${index}-impl`,
          title: `Implement: ${item.goal}`,
          description: `As a ${item.role || "user"}, I want to ${item.goal} so that ${item.benefit || "it works"}`,
          group_key: "User Stories",
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
            source_node_id: node.id,
            source_item_id: `story-${index}-ac-${acIdx}`,
            title: `Test: Given ${given}, When ${when}, Then ${then}`,
            description: `Acceptance test for US-${String(index + 1).padStart(3, "0")} AC-${acIdx + 1}`,
            group_key: "Testing",
            priority: item.priority || "Should",
            labels: ["testing"],
            status: "todo",
            is_manual: false,
            sort_order: order++,
          });
        });
      });
      break;
    }

    case "erd": {
      const entities = (fields.entities as any[]) || [];
      const rels = (fields.relationships as any[]) || [];
      let order = 0;

      entities.forEach((entity: any) => {
        if (!entity.name) return;
        // Migration task
        tasks.push({
          project_id: projectId,
          source_node_id: node.id,
          source_item_id: `erd-migration-${entity.name.toLowerCase()}`,
          title: `Create ${entity.name} migration + model`,
          description: `Database schema implementation for ${entity.name} entity.`,
          group_key: "Database",
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
            source_node_id: node.id,
            source_item_id: `erd-validation-${entity.name.toLowerCase()}`,
            title: `Add validations for ${entity.name}`,
            description: `${entity.name} has ${entity.attributes.length} attributes — add input validation rules.`,
            group_key: "Database",
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
          source_node_id: node.id,
          source_item_id: `erd-seed-${entity.name.toLowerCase()}`,
          title: `Create seed data for ${entity.name}`,
          description: `Generate sample/seed data for ${entity.name} entity.`,
          group_key: "Database",
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
          source_node_id: node.id,
          source_item_id: `erd-rel-${rel.from.toLowerCase()}-${rel.to.toLowerCase()}`,
          title: `Setup ${rel.from} ↔ ${rel.to} relationship`,
          description: `Configure ${rel.type || "one-to-many"} relationship between ${rel.from} and ${rel.to}.`,
          group_key: "Database",
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
            source_node_id: node.id,
            source_item_id: `erd-pivot-${rel.from.toLowerCase()}-${rel.to.toLowerCase()}`,
            title: `Create ${junction} pivot table`,
            description: `N:M junction table for ${rel.from} ↔ ${rel.to}.`,
            group_key: "Database",
            priority: "Must",
            labels: ["database"],
            status: "todo",
            is_manual: false,
            sort_order: order++,
          });
        }
      });
      break;
    }

    case "flowchart": {
      // Support new multi-flow format and legacy flat format
      const flows = (fields.flows as any[]) || [];
      const legacySteps = (fields.steps as any[]) || [];
      let order = 0;

      const processSteps = (steps: any[]) => {
        steps.forEach((s: any) => {
          if (!s.label || s.type === "start" || s.type === "end") return;
          const isDecision = s.type === "decision";
          tasks.push({
            project_id: projectId,
            source_node_id: node.id,
            source_item_id: `flowchart-step-${order}-${s.label.toLowerCase().replace(/\s+/g, "-")}`,
            title: isDecision ? `Validate: ${s.label}` : s.label,
            description: isDecision
              ? `Implement branching logic for: ${s.label}`
              : `Implement process: ${s.label}`,
            group_key: "Implementation",
            priority: "Must",
            labels: isDecision ? ["backend"] : ["backend", "frontend"],
            status: "todo",
            is_manual: false,
            sort_order: order++,
          });
        });
      };

      if (flows.length > 0) {
        flows.forEach((flow: any) => processSteps(flow.steps || []));
      } else {
        processSteps(legacySteps);
      }
      break;
    }

    case "sequence": {
      const participants = (fields.participants as any[]) || [];
      const messages = (fields.messages as any[]) || [];
      let order = 0;
      const seenServices = new Set<string>();
      const seenAltGroups = new Set<string>();

      // Service participant → module task
      participants.forEach((p: any) => {
        const name = typeof p === "string" ? p : p?.name || "";
        const type =
          typeof p === "string" ? "component" : p?.type || "component";
        if (type === "service" && name && !seenServices.has(name)) {
          seenServices.add(name);
          tasks.push({
            project_id: projectId,
            source_node_id: node.id,
            source_item_id: `seq-service-${name.toLowerCase().replace(/\s+/g, "-")}`,
            title: `Setup ${name} module`,
            description: `Initialize and configure the ${name} service module.`,
            group_key: "Backend",
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
            source_node_id: node.id,
            source_item_id: `seq-api-${msgIdx}-${content.toLowerCase().replace(/\s+/g, "-").substring(0, 30)}`,
            title: `Create ${method} ${endpoint}`,
            description: `API endpoint: ${content} (${msg.from} → ${msg.to})`,
            group_key: "Backend",
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
            source_node_id: node.id,
            source_item_id: `seq-msg-${msgIdx}`,
            title: `Implement: ${content}`,
            description: `Integration: ${msg.from} → ${msg.to}: ${content}`,
            group_key: "API & Integration",
            priority: "Must",
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
            source_node_id: node.id,
            source_item_id: `seq-alt-${groupLabel.toLowerCase().replace(/\s+/g, "-")}`,
            title: `Handle: ${groupLabel} error case`,
            description: `Error handling for alternative flow: ${groupLabel}`,
            group_key: "Backend",
            priority: "Should",
            labels: ["backend"],
            status: "todo",
            is_manual: false,
            sort_order: order++,
          });
        }
      });
      break;
    }

    case "dfd": {
      const dfdNodes = fields.nodes || [];
      let order = 0;
      dfdNodes.forEach((n: any) => {
        if (!n.label) return;

        if (n.type === "process") {
          tasks.push({
            project_id: projectId,
            source_node_id: node.id,
            source_item_id: `dfd-process-${order}-${n.label.toLowerCase().replace(/\s+/g, "-")}`,
            title: `Implement ${n.label} logic`,
            description: `Data Flow process implementation: ${n.label}`,
            group_key: "Backend",
            priority: "Must",
            labels: ["backend"],
            status: "todo",
            is_manual: false,
            sort_order: order++,
          });
        } else if (n.type === "entity") {
          // External system integration task
          tasks.push({
            project_id: projectId,
            source_node_id: node.id,
            source_item_id: `dfd-ext-${order}-${n.label.toLowerCase().replace(/\s+/g, "-")}`,
            title: `Integrate with ${n.label}`,
            description: `External system integration: ${n.label}`,
            group_key: "Backend",
            priority: "Should",
            labels: ["backend"],
            status: "todo",
            is_manual: false,
            sort_order: order++,
          });
        }
      });
      break;
    }

    case "use_cases": {
      const useCases = (fields.useCases as any[]) || [];
      let order = 0;

      useCases.forEach((uc: any, index: number) => {
        if (!uc.name) return;

        const actors = [
          uc.primary_actor,
          ...((uc.secondary_actors as string[]) || []),
        ].filter(Boolean);

        tasks.push({
          project_id: projectId,
          source_node_id: node.id,
          source_item_id: `use-case-${index}-${uc.name.toLowerCase().replace(/\s+/g, "-")}`,
          title: `Implement Use Case: ${uc.name}`,
          description: `Use Case implementation logic. Actors involved: ${actors.length > 0 ? actors.join(", ") : "System"}`,
          group_key: "Implementation",
          priority: "Must",
          labels: ["feature", "use-case"],
          status: "todo",
          is_manual: false,
          sort_order: order++,
        });
      });
      break;
    }
  }

  return tasks;
}

/**
 * Detect potential duplicate tasks by title similarity.
 * Returns pairs of [taskA_index, taskB_index, similarity_score].
 */
export function detectDuplicateTasks(
  tasks: { title: string; source_item_id?: string }[],
): [number, number, number][] {
  const duplicates: [number, number, number][] = [];

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(
        /^(implement|create|setup|test|validate|handle|integrate with):?\s*/i,
        "",
      )
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      // Skip if same source
      if (
        tasks[i].source_item_id &&
        tasks[i].source_item_id === tasks[j].source_item_id
      )
        continue;

      const a = normalize(tasks[i].title);
      const b = normalize(tasks[j].title);
      if (!a || !b) continue;

      const similarity = computeSimilarity(a, b);
      if (similarity >= 0.6) {
        duplicates.push([i, j, Math.round(similarity * 100)]);
      }
    }
  }

  return duplicates;
}

/** Dice coefficient on bigrams for string similarity */
function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      set.set(bg, (set.get(bg) || 0) + 1);
    }
    return set;
  };

  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);
  let intersection = 0;

  for (const [bg, count] of aBigrams) {
    intersection += Math.min(count, bBigrams.get(bg) || 0);
  }

  const totalA = Array.from(aBigrams.values()).reduce((s, c) => s + c, 0);
  const totalB = Array.from(bBigrams.values()).reduce((s, c) => s + c, 0);

  return (2 * intersection) / (totalA + totalB);
}
