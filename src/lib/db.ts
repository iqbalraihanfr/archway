import Dexie, { type EntityTable } from 'dexie';

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface NodeData {
  id: string;
  project_id: string;
  type: string;
  label: string;
  status: 'Empty' | 'In Progress' | 'Done';
  position_x: number;
  position_y: number;
  sort_order: number;
  updated_at: string;
}

export interface NodeContent {
  id: string;
  node_id: string;
  guided_fields: Record<string, any>;
  free_text: string;
  mermaid_syntax: string;
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
  title: string;
  description: string;
  group_key: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  labels: string[]; // JSON stringified array in DB, parsed in app
  is_manual: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

const db = new Dexie('archway') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  nodes: EntityTable<NodeData, 'id'>;
  nodeContents: EntityTable<NodeContent, 'id'>;
  edges: EntityTable<EdgeData, 'id'>;
  tasks: EntityTable<TaskData, 'id'>;
  attachments: EntityTable<Attachment, 'id'>;
};

// Schema declaration for version 1
db.version(1).stores({
  projects: 'id, name, created_at, updated_at', // Primary key and indexed props
  nodes: 'id, project_id, type, status, sort_order',
  nodeContents: 'id, node_id',
  edges: 'id, project_id, source_node_id, target_node_id',
  tasks: 'id, project_id, source_node_id, group_key, is_manual, sort_order',
});

// Schema declaration for version 2
db.version(2).stores({
  projects: 'id, name, created_at, updated_at',
  nodes: 'id, project_id, type, status, sort_order',
  nodeContents: 'id, node_id',
  edges: 'id, project_id, source_node_id, target_node_id',
  tasks: 'id, project_id, source_node_id, group_key, is_manual, sort_order',
  attachments: 'id, node_id, filename, mime_type, created_at',
});

export { db };
