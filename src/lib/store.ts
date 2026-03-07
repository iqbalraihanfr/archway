import { create } from 'zustand';
import { NodeData, EdgeData } from './db';

interface WorkspaceState {
  activeProjectId: string | null;
  activeNodeId: string | null;
  nodes: NodeData[];
  edges: EdgeData[];
  
  // Actions
  setActiveProject: (id: string | null) => void;
  setActiveNode: (id: string | null) => void;
  setNodes: (nodes: NodeData[]) => void;
  setEdges: (edges: EdgeData[]) => void;
  
  updateNodeStatus: (id: string, status: NodeData['status']) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeProjectId: null,
  activeNodeId: null,
  nodes: [],
  edges: [],

  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveNode: (id) => set({ activeNodeId: id }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  updateNodeStatus: (id, status) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, status } : node
      ),
    })),
}));
