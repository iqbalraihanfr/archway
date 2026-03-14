import Dexie, { type EntityTable } from "dexie";

export interface Project {
  id: string;
  name: string;
  description: string;
  template_type: "quick" | "full" | "blank";
  created_at: string;
  updated_at: string;
}

export interface NodeData {
  id: string;
  project_id: string;
  type: string;
  label: string;
  status: "Empty" | "In Progress" | "Done";
  position_x: number;
  position_y: number;
  sort_order: number;
  updated_at: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type StructuredFields = {
  [key: string]: any;
};

export interface NodeContent {
  id: string;
  node_id: string;
  structured_fields: StructuredFields;
  mermaid_auto: string;
  mermaid_manual?: string;
  updated_at: string;
}

export interface EdgeData {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
}

export interface TaskData {
  id: string;
  project_id: string;
  source_node_id: string | null;
  source_item_id?: string;
  title: string;
  description: string;
  group_key: string; // Internal implementation group (e.g. "Database", "API")
  feature_name?: string; // High-level feature (e.g. "Authentication", "Billing")
  priority_tier?: "P0" | "P1" | "P2" | "P3";
  dod_items?: { text: string; done: boolean }[]; // Interactive Definition of Done
  priority:
    | "Must"
    | "Should"
    | "Could"
    | "Wont"
    | "must"
    | "should"
    | "could"
    | "wont";
  labels: string[]; // JSON stringified array in DB, parsed in app
  status: "todo" | "in_progress" | "done";
  is_manual: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ValidationWarning {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_type?: string;
  severity: "error" | "warning" | "info";
  message: string;
  rule_id?: string;
}

export interface Attachment {
  id: string;
  node_id: string;
  filename: string;
  mime_type: string;
  size: number;
  data: Blob;
  created_at: string;
}

const db = new Dexie("archway") as Dexie & {
  projects: EntityTable<Project, "id">;
  nodes: EntityTable<NodeData, "id">;
  nodeContents: EntityTable<NodeContent, "id">;
  edges: EntityTable<EdgeData, "id">;
  tasks: EntityTable<TaskData, "id">;
  attachments: EntityTable<Attachment, "id">;
  validationWarnings: EntityTable<ValidationWarning, "id">;
};

// Schema declaration for version 1
db.version(1).stores({
  projects: "id, name, created_at, updated_at", // Primary key and indexed props
  nodes: "id, project_id, type, status, sort_order",
  nodeContents: "id, node_id",
  edges: "id, project_id, source_node_id, target_node_id",
  tasks: "id, project_id, source_node_id, group_key, is_manual, sort_order",
});

// Schema declaration for version 2
db.version(2).stores({
  projects: "id, name, created_at, updated_at",
  nodes: "id, project_id, type, status, sort_order",
  nodeContents: "id, node_id",
  edges: "id, project_id, source_node_id, target_node_id",
  tasks: "id, project_id, source_node_id, group_key, is_manual, sort_order",
  attachments: "id, node_id, filename, mime_type, created_at",
});

// Schema declaration for version 3 (Structured Input Overhaul)
db.version(3).stores({
  projects: "id, name, created_at, updated_at",
  nodes: "id, project_id, type, status, sort_order",
  nodeContents: "id, node_id",
  edges: "id, project_id, source_node_id, target_node_id",
  tasks:
    "id, project_id, source_node_id, source_item_id, status, group_key, is_manual, sort_order",
  attachments: "id, node_id, filename, mime_type, created_at",
  validationWarnings:
    "id, project_id, source_node_id, target_node_type, severity, rule_id",
});

// Schema declaration for version 4 (Persist selected project template)
db.version(4)
  .stores({
    projects: "id, name, template_type, created_at, updated_at",
    nodes: "id, project_id, type, status, sort_order",
    nodeContents: "id, node_id",
    edges: "id, project_id, source_node_id, target_node_id",
    tasks:
      "id, project_id, source_node_id, source_item_id, status, group_key, is_manual, sort_order",
    attachments: "id, node_id, filename, mime_type, created_at",
    validationWarnings:
      "id, project_id, source_node_id, target_node_type, severity, rule_id",
  })
  .upgrade(async (tx) => {
    await tx
      .table("projects")
      .toCollection()
      .modify((project: Project) => {
        if (!project.template_type) {
          project.template_type = "quick";
        }
      });
  });

// Schema declaration for version 5 (Feature-based tasks)
db.version(5).stores({
  projects: "id, name, template_type, created_at, updated_at",
  nodes: "id, project_id, type, status, sort_order",
  nodeContents: "id, node_id",
  edges: "id, project_id, source_node_id, target_node_id",
  tasks:
    "id, project_id, source_node_id, source_item_id, status, feature_name, priority_tier, group_key, is_manual, sort_order",
  attachments: "id, node_id, filename, mime_type, created_at",
  validationWarnings:
    "id, project_id, source_node_id, target_node_type, severity, rule_id",
});

export { db };
