"use client";

import { useEffect, useCallback, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  Background, 
  Controls, 
  Node as FlowNode, 
  Edge as FlowEdge, 
  useNodesState, 
  useEdgesState,
  Connection,
  addEdge,
  BackgroundVariant,
  MiniMap,
  SelectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, NodeData } from '@/lib/db';
import { ArchwayNode } from '@/components/ArchwayNode';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { NodeEditorPanel } from '@/components/NodeEditorPanel';

function WorkspaceContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId]);
  const dbNodes = useLiveQuery(() => db.nodes.where({ project_id: projectId }).toArray(), [projectId]);
  const dbEdges = useLiveQuery(() => db.edges.where({ project_id: projectId }).toArray(), [projectId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  
  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(null);

  const nodeTypes = useMemo(() => ({
    brief: ArchwayNode,
    requirements: ArchwayNode,
    user_stories: ArchwayNode,
    use_case: ArchwayNode,
    flowchart: ArchwayNode,
    dfd: ArchwayNode,
    erd: ArchwayNode,
    sequence: ArchwayNode,
    task_board: ArchwayNode,
    summary: ArchwayNode,
    custom: ArchwayNode
  }), []);

  // Sync DB nodes to React Flow nodes
  useEffect(() => {
    if (dbNodes && dbEdges) {
      // Determine the recommended next node for soft guidance
      const STANDARD_NODE_ORDER = [
        'project_brief', 'requirements', 'user_stories', 'use_case', 
        'flowchart', 'dfd', 'erd', 'sequence', 'task_board', 'summary'
      ];
      const sortedNodes = [...dbNodes].sort((a, b) => {
        return STANDARD_NODE_ORDER.indexOf(a.type) - STANDARD_NODE_ORDER.indexOf(b.type);
      });
      const nextNode = sortedNodes.find(n => n.status !== 'Done');
      const recommendedNextNodeId = nextNode ? nextNode.id : null;

      const flowNodes: FlowNode[] = dbNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: { x: n.position_x, y: n.position_y },
        data: {
          ...n,
          isNext: n.id === recommendedNextNodeId
        } as unknown as Record<string, unknown>,
      }));
      setNodes(flowNodes);

      const flowEdges: FlowEdge[] = dbEdges.map((e) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
      }));
      setEdges(flowEdges);
    }
  }, [dbNodes, dbEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    async (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      if (params.source && params.target) {
        await db.edges.add({
          id: crypto.randomUUID(),
          project_id: projectId,
          source_node_id: params.source,
          target_node_id: params.target
        });
      }
    },
    [setEdges, projectId],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeData(node.data as unknown as NodeData);
  }, []);

  const handleEditorClose = useCallback(() => {
    setSelectedNodeData(null);
  }, []);

  if (!project) return <div className="p-8">Loading project workspace...</div>;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      {/* Header Pipeline */}
      <header className="h-14 border-b bg-card flex items-center px-4 justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold">{project.name}</div>
          <div className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">{dbNodes?.filter(n => n.status === 'Done').length || 0} / {dbNodes?.length || 0} Nodes Done</div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm">Export ▼</Button>
        </div>
      </header>
      
      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            
            // Trackpad / mouse navigation
            panOnScroll={true}           // Two-finger pan (like Excalidraw)
            panOnDrag={[1, 2]}           // Middle/Right click-and-drag to pan (Default spacebar works too)
            selectionOnDrag={true}       // Left click-and-drag builds a selection box
            selectionMode={SelectionMode.Partial} // Box selection selects on touch
            panActivationKeyCode="Space" // Hold spacebar to pan
            zoomOnScroll={false}         // Disable scroll-to-zoom (conflicts with pan)
            zoomOnPinch={true}           // Pinch-to-zoom on trackpad
            zoomOnDoubleClick={false}    // Disable double-click zoom (accidental triggers)
            
            // Zoom limits
            minZoom={0.1}
            maxZoom={2}
            
            // Smooth animations
            fitViewOptions={{ padding: 0.2, duration: 300 }}
            
            // Controls
            proOptions={{ hideAttribution: true }}

            fitView
            className="bg-dot-pattern"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
            <Controls position="bottom-left" />
            <MiniMap 
              position="bottom-right"
              nodeColor="#52B788"
              maskColor="rgba(0,0,0,0.7)"
            />
          </ReactFlow>
        </div>
        
        {/* Right Editor Panel */}
        {selectedNodeData && (
          <NodeEditorPanel node={selectedNodeData} onClose={handleEditorClose} />
        )}
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();

  if (!params?.id) return null;

  return (
    <ReactFlowProvider>
      <WorkspaceContent projectId={params.id} />
    </ReactFlowProvider>
  );
}
