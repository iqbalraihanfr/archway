import { db, NodeData, NodeContent, ValidationWarning, TaskData, Attachment } from "./db";
import { MERMAID_TEMPLATES } from "@/components/editors/panel/constants";
import type { ProjectBriefFields } from "@/components/editors/ProjectBriefEditor";
import type { ContentTemplate } from "./contentTemplates";
import { generateTasksFromNode } from "./taskEngine";

export interface ProjectTemplate {
  label: string;
  description: string;
  nodes: { type: string; label: string; x?: number; y?: number }[];
  edges: { from: string; to: string }[];
}

export const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  quick: {
    label: "Quick Start",
    description: "Brief → Requirements → ERD → Task Board → Summary.",
    nodes: [
      { type: "project_brief", label: "Project Brief", x: 0, y: 0 },
      { type: "requirements", label: "Requirements", x: 350, y: 0 },
      { type: "erd", label: "ERD", x: 700, y: 0 },
      { type: "task_board", label: "Task Board", x: 1050, y: 0 },
      { type: "summary", label: "Summary", x: 1400, y: 0 },
    ],
    edges: [
      { from: "project_brief", to: "requirements" },
      { from: "requirements", to: "erd" },
      { from: "requirements", to: "task_board" },
      { from: "erd", to: "task_board" },
      { from: "task_board", to: "summary" },
    ],
  },
  full: {
    label: "Full Architecture",
    description: "Complete architecture workflow.",
    nodes: [
      { type: "project_brief", label: "Project Brief", x: 0, y: 0 },
      { type: "requirements", label: "Requirements", x: 300, y: 0 },
      { type: "user_stories", label: "User Stories", x: 600, y: 0 },
      { type: "use_cases", label: "Use Case", x: 0, y: 150 },
      { type: "flowchart", label: "Flowchart", x: 300, y: 150 },
      { type: "dfd", label: "DFD", x: 0, y: 300 },
      { type: "erd", label: "ERD", x: 300, y: 300 },
      { type: "sequence", label: "Sequence", x: 600, y: 300 },
      { type: "task_board", label: "Task Board", x: 0, y: 450 },
      { type: "summary", label: "Summary", x: 300, y: 450 },
    ],
    edges: [
      { from: "project_brief", to: "requirements" },
      { from: "requirements", to: "user_stories" },
      { from: "user_stories", to: "use_cases" },
      { from: "use_cases", to: "flowchart" },
      { from: "use_cases", to: "dfd" },
      { from: "erd", to: "sequence" },
      { from: "sequence", to: "task_board" },
      { from: "task_board", to: "summary" },
    ],
  },
  blank: {
    label: "Blank Canvas",
    description: "Start empty and build your own flow.",
    nodes: [],
    edges: [],
  },
};

/** Node types that the task engine can generate tasks from */
const TASK_GENERATING_TYPES = new Set([
  "erd",
  "flowchart",
  "sequence",
  "dfd",
  "use_cases",
  "user_stories",
]);

export async function createProject(params: {
  name: string;
  description: string;
  templateKey: string;
  initialBriefContent?: ProjectBriefFields;
  contentTemplate?: ContentTemplate;
}): Promise<string> {
  const { name, description, templateKey, initialBriefContent, contentTemplate } = params;
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Collect seeded nodes so we can generate tasks after the transaction
  const seededNodes: { node: NodeData; content: NodeContent }[] = [];

  await db.transaction(
    "rw",
    [db.projects, db.nodes, db.nodeContents, db.edges],
    async () => {
      // 1. Create project
      await db.projects.add({
        id: projectId,
        name,
        description,
        template_type: templateKey as "quick" | "full" | "blank",
        created_at: now,
        updated_at: now,
      });

      const template = PROJECT_TEMPLATES[templateKey] || PROJECT_TEMPLATES.blank;
      const nodeMap = new Map<string, string>();

      // 2. Add nodes
      for (const nodeTpl of template.nodes) {
        const nodeId = crypto.randomUUID();
        nodeMap.set(nodeTpl.type, nodeId);

        // Determine seeded content for this node
        let structuredFields: Record<string, unknown> = {};
        let mermaidManual = "";
        let hasContent = false;

        if (contentTemplate) {
          if (nodeTpl.type === "project_brief") {
            structuredFields = { ...contentTemplate.brief, name };
            hasContent = Object.keys(contentTemplate.brief).length > 0;
          } else if (nodeTpl.type === "requirements" && contentTemplate.requirements) {
            structuredFields = contentTemplate.requirements;
            hasContent = true;
          } else if (nodeTpl.type === "erd" && contentTemplate.erd) {
            structuredFields = contentTemplate.erd;
            hasContent = true;
          } else if (nodeTpl.type === "flowchart" && contentTemplate.mermaid?.flowchart) {
            mermaidManual = contentTemplate.mermaid.flowchart;
            hasContent = true;
          } else if (nodeTpl.type === "sequence" && contentTemplate.mermaid?.sequence) {
            mermaidManual = contentTemplate.mermaid.sequence;
            hasContent = true;
          } else if (nodeTpl.type === "dfd" && contentTemplate.mermaid?.dfd) {
            mermaidManual = contentTemplate.mermaid.dfd;
            hasContent = true;
          }
        } else if (nodeTpl.type === "project_brief" && initialBriefContent) {
          structuredFields = { ...initialBriefContent, name };
          hasContent = true;
        }

        // Fix #1: seed nodes start as "In Progress", not "Empty"
        const nodeStatus: NodeData["status"] = hasContent ? "In Progress" : "Empty";

        await db.nodes.add({
          id: nodeId,
          project_id: projectId,
          type: nodeTpl.type,
          label: nodeTpl.label,
          status: nodeStatus,
          position_x: nodeTpl.x || 0,
          position_y: nodeTpl.y || 0,
          sort_order: template.nodes.indexOf(nodeTpl),
          updated_at: now,
        });

        const nodeContent: NodeContent = {
          id: crypto.randomUUID(),
          node_id: nodeId,
          structured_fields: structuredFields,
          mermaid_auto: MERMAID_TEMPLATES[nodeTpl.type] || "",
          mermaid_manual: mermaidManual,
          updated_at: now,
        };

        await db.nodeContents.add(nodeContent);

        // Collect task-generating nodes that have structured content
        if (hasContent && TASK_GENERATING_TYPES.has(nodeTpl.type) && Object.keys(structuredFields).length > 0) {
          const nodeData: NodeData = {
            id: nodeId,
            project_id: projectId,
            type: nodeTpl.type,
            label: nodeTpl.label,
            status: nodeStatus,
            position_x: nodeTpl.x || 0,
            position_y: nodeTpl.y || 0,
            sort_order: template.nodes.indexOf(nodeTpl),
            updated_at: now,
          };
          seededNodes.push({ node: nodeData, content: nodeContent });
        }
      }

      // 3. Add edges
      for (const edgeTpl of template.edges) {
        const sourceId = nodeMap.get(edgeTpl.from);
        const targetId = nodeMap.get(edgeTpl.to);

        if (sourceId && targetId) {
          await db.edges.add({
            id: crypto.randomUUID(),
            project_id: projectId,
            source_node_id: sourceId,
            target_node_id: targetId,
          });
        }
      }
    },
  );

  // Fix #2: generate tasks for seeded nodes immediately after project creation
  if (seededNodes.length > 0) {
    const allGeneratedTasks: TaskData[] = [];

    for (const { node, content } of seededNodes) {
      const rawTasks = generateTasksFromNode(node, content, projectId);
      const tasks: TaskData[] = rawTasks.map((t) => ({
        ...t,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      }));
      allGeneratedTasks.push(...tasks);
    }

    if (allGeneratedTasks.length > 0) {
      await db.transaction("rw", [db.tasks], async () => {
        await db.tasks.bulkAdd(allGeneratedTasks);
      });
    }
  }

  return projectId;
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.projects,
      db.nodes,
      db.nodeContents,
      db.edges,
      db.validationWarnings,
      db.tasks,
      db.attachments,
    ],
    async () => {
      const projectNodes = await db.nodes
        .where({ project_id: projectId })
        .toArray();
      const nodeIds = projectNodes.map((n) => n.id);

      await db.projects.delete(projectId);
      await db.nodes.where({ project_id: projectId }).delete();
      await db.edges.where({ project_id: projectId }).delete();
      await db.validationWarnings.where({ project_id: projectId }).delete();
      await db.tasks.where({ project_id: projectId }).delete();

      if (nodeIds.length > 0) {
        await db.nodeContents.where("node_id").anyOf(nodeIds).delete();
        await db.attachments.where("node_id").anyOf(nodeIds).delete();
      }
    },
  );
}
