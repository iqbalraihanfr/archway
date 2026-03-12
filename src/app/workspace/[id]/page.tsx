"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useParams } from "next/navigation";
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
  SelectionMode,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

import { db, NodeData } from "@/lib/db";
import { ArchwayNode } from "@/components/ArchwayNode";
import { ArchwayEdge } from "@/components/ArchwayEdge";
import { Button } from "@/components/ui/button";
import { NodeEditorPanel } from "@/components/editors/NodeEditorPanel";
import { ValidationSummaryPanel } from "@/components/editors/ValidationSummaryPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { WorkspaceCommandDialog } from "@/components/layout/WorkspaceCommandDialog";
import { WorkspaceHelpDialog } from "@/components/layout/WorkspaceHelpDialog";
import { getValidationTone } from "../utils";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { WorkspaceOverlays } from "./components/WorkspaceOverlays";
import { useWorkspaceData } from "../hooks/useWorkspaceData";
import { useWorkspaceActions } from "../hooks/useWorkspaceActions";
import { updateNodePosition } from "@/lib/workspaceEngine";

const WORKSPACE_ONBOARDING_KEY = "archway-workspace-onboarding-dismissed";

type DeleteNodeState = {
  id: string;
  label: string;
} | null;

function WorkspaceContent({ projectId }: { projectId: string }) {
  const reactFlow = useReactFlow();

  // Custom Hooks for Data and Actions
  const {
    project,
    dbNodes,
    dbEdges,
    dbContents,
    dbWarnings,
    sortedNodes,
    recommendedNextNode,
    doneCount,
    errorCount,
    warningCount,
    infoCount,
    progressPercent,
    validationTone,
  } = useWorkspaceData(projectId);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  const [selectedNodeData, setSelectedNodeData] = useState<NodeData | null>(
    null,
  );
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [deleteNodeState, setDeleteNodeState] = useState<DeleteNodeState>(null);
  const [isDeletingNode, setIsDeletingNode] = useState(false);

  const flowWrapperRef = useRef<HTMLDivElement | null>(null);

  // Focus and Selection handlers
  const focusNodeInCanvas = useCallback(
    (node: NodeData) => {
      reactFlow.setCenter(node.position_x + 150, node.position_y + 60, {
        zoom: 0.8,
        duration: 350,
      });
    },
    [reactFlow],
  );

  const handleOpenNode = useCallback(
    (node: NodeData) => {
      setSelectedNodeData(node);
      setEditorCollapsed(false);
      focusNodeInCanvas(node);
    },
    [focusNodeInCanvas],
  );

  const { handleAddNode, handleDeleteNode, handleConnect } = useWorkspaceActions({
    projectId,
    dbNodes,
    onOpenNode: handleOpenNode,
  });

  const nodeTypes = useMemo(
    () => ({
      project_brief: ArchwayNode,
      requirements: ArchwayNode,
      user_stories: ArchwayNode,
      use_cases: ArchwayNode,
      flowchart: ArchwayNode,
      dfd: ArchwayNode,
      erd: ArchwayNode,
      sequence: ArchwayNode,
      task_board: ArchwayNode,
      summary: ArchwayNode,
      custom: ArchwayNode,
    }),
    [],
  );

  const edgeTypes = useMemo(
    () => ({
      archway: ArchwayEdge,
    }),
    [],
  );

  const helpChecklist = useMemo(
    () => [
      {
        id: "open-node",
        label: "Open a node and start editing from the Guided tab.",
        done:
          selectedNodeData !== null ||
          dbNodes.some((node) => node.status !== "Empty"),
      },
      {
        id: "complete-brief",
        label: "Complete the Project Brief so downstream nodes have context.",
        done: dbNodes.some(
          (node) => node.type === "project_brief" && node.status === "Done",
        ),
      },
      {
        id: "review-validation",
        label: "Review validation at least once while building the flow.",
        done: showValidationPanel || dbWarnings.length === 0,
      },
      {
        id: "move-to-execution",
        label: "Reach Task Board or Summary as the workspace matures.",
        done: dbNodes.some(
          (node) =>
            (node.type === "task_board" || node.type === "summary") &&
            node.status !== "Empty",
        ),
      },
    ],
    [dbNodes, dbWarnings.length, selectedNodeData, showValidationPanel],
  );

  const commandNodes = useMemo(
    () =>
      sortedNodes.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        status: node.status,
        isNext: node.id === recommendedNextNode?.id,
      })),
    [recommendedNextNode, sortedNodes],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isDismissed =
      window.localStorage.getItem(WORKSPACE_ONBOARDING_KEY) === "true";

    if (showOnboarding !== !isDismissed) {
      setShowOnboarding(!isDismissed);
    }
  }, [projectId, showOnboarding]);

  // Sync DB Nodes to Flow Nodes
  useEffect(() => {
    if (dbNodes.length === 0) {
      setNodes([]);
      return;
    }

    const flowNodes: FlowNode[] = dbNodes.map((node) => {
      const nodeWarnings = dbWarnings.filter(
        (warning) => warning.source_node_id === node.id,
      );

      return {
        id: node.id,
        type: node.type,
        position: { x: node.position_x, y: node.position_y },
        data: {
          ...node,
          isNext: node.id === recommendedNextNode?.id,
          warnings: nodeWarnings,
        } as unknown as Record<string, unknown>,
      };
    });

    setNodes(flowNodes);
  }, [dbNodes, dbWarnings, recommendedNextNode, setNodes]);

  // Sync DB Edges to Flow Edges
  useEffect(() => {
    if (dbEdges.length === 0 || nodes.length === 0) {
      setEdges([]);
      return;
    }

    const flowEdges: FlowEdge[] = dbEdges.map((edge) => {
      let sourceHandle = "right";
      let targetHandle = "left";

      const sourceNode = nodes.find((node) => node.id === edge.source_node_id);
      const targetNode = nodes.find((node) => node.id === edge.target_node_id);

      if (sourceNode?.position && targetNode?.position) {
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;

        if (dy > 80 || dx < -50) {
          sourceHandle = "bottom";
          targetHandle = "top";
        }
      }

      return {
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        sourceHandle,
        targetHandle,
        type: "archway",
        animated: true,
        markerEnd: {
          type: MarkerType.Arrow,
          width: 20,
          height: 20,
          color: "#94a3b8",
          strokeWidth: 2,
        },
      };
    });

    setEdges(flowEdges);
  }, [dbEdges, nodes, setEdges]);

  const dismissOnboarding = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKSPACE_ONBOARDING_KEY, "true");
    }
    setShowOnboarding(false);
  }, []);

  const handleJumpToNode = useCallback(
    (nodeId: string) => {
      const targetNode = dbNodes.find((node) => node.id === nodeId);
      if (!targetNode) return;
      handleOpenNode(targetNode);
    },
    [dbNodes, handleOpenNode],
  );

  const handleJumpToRecommendedNode = useCallback(() => {
    if (!recommendedNextNode) return;
    handleOpenNode(recommendedNextNode);
  }, [handleOpenNode, recommendedNextNode]);

  const handleFitView = useCallback(() => {
    reactFlow.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlow]);

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: FlowNode) => {
      await updateNodePosition(node.id, node.position.x, node.position.y);
    },
    [],
  );

  const onConnect = useCallback(
    async (params: Connection) => {
      // Immediate local state update for UX
      setEdges((currentEdges) => addEdge(params, currentEdges));

      if (params.source && params.target) {
        await handleConnect(params.source, params.target);
      }
    },
    [handleConnect, setEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      handleOpenNode(node.data as unknown as NodeData);
    },
    [handleOpenNode],
  );

  const handleEditorClose = useCallback(() => {
    setSelectedNodeData(null);
    setEditorCollapsed(false);
  }, []);

  const requestDeleteNode = useCallback(
    (nodeId: string) => {
      const targetNode =
        dbNodes.find((node) => node.id === nodeId) ??
        (selectedNodeData?.id === nodeId ? selectedNodeData : null);

      if (!targetNode) return;

      setDeleteNodeState({
        id: targetNode.id,
        label: targetNode.label,
      });
    },
    [dbNodes, selectedNodeData],
  );

  const confirmDeleteNode = useCallback(async () => {
    if (!deleteNodeState) return;

    setIsDeletingNode(true);

    try {
      const nodeId = deleteNodeState.id;

      await handleDeleteNode(nodeId);

      if (selectedNodeData?.id === nodeId) {
        setSelectedNodeData(null);
      }

      setDeleteNodeState(null);
    } finally {
      setIsDeletingNode(false);
    }
  }, [deleteNodeState, handleDeleteNode, selectedNodeData]);

  const handleValidationNavigate = useCallback(
    (nodeId: string) => {
      const targetNode = dbNodes.find((node) => node.id === nodeId);
      if (targetNode) {
        handleOpenNode(targetNode);
      }
    },
    [dbNodes, handleOpenNode],
  );

  const handleCanvasKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowCommandDialog(true);
        return;
      }

      if (isEditable) return;

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        handleFitView();
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleJumpToRecommendedNode();
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setShowCommandDialog(true);
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setShowHelpDialog(true);
      }
    },
    [handleFitView, handleJumpToRecommendedNode],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleCanvasKeyDown);
    return () => window.removeEventListener("keydown", handleCanvasKeyDown);
  }, [handleCanvasKeyDown]);

  const handleCanvasWrapperKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" && !selectedNodeData && recommendedNextNode) {
        event.preventDefault();
        handleJumpToRecommendedNode();
      }
    },
    [handleJumpToRecommendedNode, recommendedNextNode, selectedNodeData],
  );

  if (!project) {
    return <div className="p-8">Loading project workspace...</div>;
  }

  return (
    <div className="workspace-shell h-screen w-full overflow-hidden">
      <div className="flex h-full flex-col overflow-hidden">
        <WorkspaceHeader
          project={project}
          dbNodes={dbNodes}
          dbContents={dbContents}
          doneCount={doneCount}
          progressPercent={progressPercent}
          recommendedNextNode={recommendedNextNode}
          errorCount={errorCount}
          warningCount={warningCount}
          infoCount={infoCount}
          selectedNodeData={selectedNodeData}
          editorCollapsed={editorCollapsed}
          validationTone={validationTone}
          onJumpNext={handleJumpToRecommendedNode}
          onShowCommand={() => setShowCommandDialog(true)}
          onFitView={handleFitView}
          onShowHelp={() => setShowHelpDialog(true)}
          onToggleValidation={() => setShowValidationPanel((v) => !v)}
          onAddNode={handleAddNode}
          onToggleEditor={() => setEditorCollapsed((v) => !v)}
        />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {showValidationPanel && (
            <div className="absolute bottom-3 left-3 top-3 z-30 w-[min(420px,calc(100vw-1.5rem))] max-w-full md:left-4 md:w-100">
              <ValidationSummaryPanel
                warnings={dbWarnings}
                onCloseAction={() => setShowValidationPanel(false)}
                onNodeNavigateAction={handleValidationNavigate}
              />
            </div>
          )}

          <WorkspaceOverlays
            showOnboarding={showOnboarding}
            recommendedNextNode={!selectedNodeData ? recommendedNextNode : null}
            dbWarningsLength={dbWarnings.length}
            dbNodesLength={dbNodes.length}
            showValidationPanel={showValidationPanel}
            onDismissOnboarding={dismissOnboarding}
            onShowHelp={() => setShowHelpDialog(true)}
            onJumpNext={handleJumpToRecommendedNode}
          />

          <div
            ref={flowWrapperRef}
            className="relative min-w-0 flex-1"
            tabIndex={0}
            onKeyDown={handleCanvasWrapperKeyDown}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{
                type: "archway",
                animated: true,
                markerEnd: {
                  type: MarkerType.Arrow,
                  width: 20,
                  height: 20,
                  color: "#94a3b8",
                  strokeWidth: 2,
                },
              }}
              panOnScroll
              panOnDrag={[1, 2]}
              selectionOnDrag
              selectionMode={SelectionMode.Partial}
              panActivationKeyCode="Space"
              zoomOnScroll={false}
              zoomOnPinch
              zoomOnDoubleClick={false}
              minZoom={0.1}
              maxZoom={2}
              fitViewOptions={{ padding: 0.2, duration: 300 }}
              proOptions={{ hideAttribution: true }}
              fitView
              className="bg-dot-pattern"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1}
                color="var(--workspace-grid)"
              />
              <Controls position="bottom-left" />
              <MiniMap
                position="bottom-right"
                nodeColor="#52B788"
                maskColor="rgba(0,0,0,0.55)"
              />
            </ReactFlow>
          </div>

          {selectedNodeData && !editorCollapsed && (
            <div className="workspace-panel relative z-20 h-full w-[min(100%,680px)] shrink-0 border-l border-border/70">
              <div className="absolute left-0 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-background shadow-sm"
                  onClick={() => setEditorCollapsed(true)}
                  aria-label="Collapse editor panel"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <NodeEditorPanel
                key={selectedNodeData.id}
                node={selectedNodeData}
                onCloseAction={handleEditorClose}
                onDeleteAction={() => requestDeleteNode(selectedNodeData.id)}
              />
            </div>
          )}

          {selectedNodeData && editorCollapsed && (
            <div className="absolute right-3 top-1/2 z-30 -translate-y-1/2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-background shadow-sm"
                onClick={() => setEditorCollapsed(false)}
                aria-label="Expand editor panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}

          {dbWarnings.length > 0 && (
            <div className="absolute right-4 top-4 z-20 md:hidden">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-background/90"
                onClick={() => setShowValidationPanel(true)}
              >
                <Info className="mr-2 h-4 w-4" />
                Issues
              </Button>
            </div>
          )}
        </div>
      </div>

      <WorkspaceCommandDialog
        open={showCommandDialog}
        onOpenChange={setShowCommandDialog}
        nodes={commandNodes}
        validationCount={dbWarnings.length}
        onNodeSelect={handleJumpToNode}
        onNextNode={handleJumpToRecommendedNode}
        onFitView={handleFitView}
        onShowValidation={() => setShowValidationPanel(true)}
      />

      <WorkspaceHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        checklist={helpChecklist}
      />

      <ConfirmDialog
        open={Boolean(deleteNodeState)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteNodeState(null);
          }
        }}
        title="Delete node"
        description={
          deleteNodeState
            ? `Delete “${deleteNodeState.label}”? All node content and generated tasks connected to this node will be removed.`
            : ""
        }
        confirmLabel="Delete node"
        cancelLabel="Cancel"
        variant="destructive"
        loading={isDeletingNode}
        onConfirm={confirmDeleteNode}
      />
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
