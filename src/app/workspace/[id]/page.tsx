"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Command,
  Download,
  HelpCircle,
  Info,
  Maximize,
  PanelRight,
  Plus,
  Sparkles,
} from "lucide-react";

import { db, NodeData } from "@/lib/db";
import { ArchwayNode } from "@/components/ArchwayNode";
import { ArchwayEdge } from "@/components/ArchwayEdge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NodeEditorPanel } from "@/components/NodeEditorPanel";
import { ValidationSummaryPanel } from "@/components/ValidationSummaryPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WorkspaceCommandDialog } from "@/components/WorkspaceCommandDialog";
import { WorkspaceHelpDialog } from "@/components/WorkspaceHelpDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportProjectToMarkdown,
  exportProjectToPDF,
} from "@/lib/exportEngine";
import { ModeToggle } from "@/components/mode-toggle";

const WORKSPACE_ONBOARDING_KEY = "archway-workspace-onboarding-dismissed";

type ValidationTone = "success" | "warning" | "danger" | "info";

function formatRelativeProjectState(doneCount: number, totalCount: number) {
  if (totalCount === 0) {
    return { label: "No nodes yet", tone: "warning" as ValidationTone };
  }

  if (doneCount === totalCount) {
    return { label: "All nodes complete", tone: "success" as ValidationTone };
  }

  if (doneCount === 0) {
    return { label: "Start documenting", tone: "warning" as ValidationTone };
  }

  return { label: "In progress", tone: "info" as ValidationTone };
}

function getValidationTone(
  errorCount: number,
  warningCount: number,
): ValidationTone {
  if (errorCount > 0) return "danger";
  if (warningCount > 0) return "warning";
  return "success";
}

function getMetricPillClass(tone: ValidationTone) {
  switch (tone) {
    case "danger":
      return "metric-pill metric-pill--danger";
    case "warning":
      return "metric-pill metric-pill--warning";
    case "info":
      return "metric-pill metric-pill--info";
    default:
      return "metric-pill metric-pill--success";
  }
}

type DeleteNodeState = {
  id: string;
  label: string;
} | null;

function WorkspaceContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const reactFlow = useReactFlow();

  const project = useLiveQuery(
    () => db.projects.get(projectId),
    [projectId],
    null,
  );
  const dbNodes = useLiveQuery(
    () => db.nodes.where({ project_id: projectId }).toArray(),
    [projectId],
    [],
  );
  const dbEdges = useLiveQuery(
    () => db.edges.where({ project_id: projectId }).toArray(),
    [projectId],
    [],
  );
  const dbContents = useLiveQuery(() => db.nodeContents.toArray(), [], []);
  const dbWarnings = useLiveQuery(
    () => db.validationWarnings.where({ project_id: projectId }).toArray(),
    [projectId],
    [],
  );

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

  const standardNodeOrder = useMemo(
    () => [
      "project_brief",
      "requirements",
      "user_stories",
      "use_cases",
      "flowchart",
      "dfd",
      "erd",
      "sequence",
      "task_board",
      "summary",
      "custom",
    ],
    [],
  );

  const sortedNodes = useMemo(() => {
    return [...dbNodes].sort((a, b) => {
      const orderA = standardNodeOrder.indexOf(a.type);
      const orderB = standardNodeOrder.indexOf(b.type);
      const normalizedA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
      const normalizedB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;

      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      return a.sort_order - b.sort_order;
    });
  }, [dbNodes, standardNodeOrder]);

  const recommendedNextNode = useMemo(
    () => sortedNodes.find((node) => node.status !== "Done") || null,
    [sortedNodes],
  );

  const doneCount = useMemo(
    () => dbNodes.filter((node) => node.status === "Done").length,
    [dbNodes],
  );

  const errorCount = useMemo(
    () => dbWarnings.filter((warning) => warning.severity === "error").length,
    [dbWarnings],
  );

  const warningCount = useMemo(
    () => dbWarnings.filter((warning) => warning.severity === "warning").length,
    [dbWarnings],
  );

  const infoCount = useMemo(
    () => dbWarnings.filter((warning) => warning.severity === "info").length,
    [dbWarnings],
  );

  const progressPercent =
    dbNodes.length > 0 ? Math.round((doneCount / dbNodes.length) * 100) : 0;

  const projectProgressMeta = formatRelativeProjectState(
    doneCount,
    dbNodes.length,
  );
  const validationTone = getValidationTone(errorCount, warningCount);

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
      await db.nodes.update(node.id, {
        position_x: node.position.x,
        position_y: node.position.y,
      });
    },
    [],
  );

  const onConnect = useCallback(
    async (params: Connection) => {
      setEdges((currentEdges) => addEdge(params, currentEdges));

      if (params.source && params.target) {
        await db.edges.add({
          id: crypto.randomUUID(),
          project_id: projectId,
          source_node_id: params.source,
          target_node_id: params.target,
        });
      }
    },
    [projectId, setEdges],
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

  const handleAddNode = useCallback(
    async (type: string, baseLabel: string) => {
      const newId = crypto.randomUUID();
      let x = Math.random() * 500;
      let y = Math.random() * 500 + 100;

      const normalNodes =
        dbNodes.filter(
          (node) => node.type !== "summary" && node.type !== "task_board",
        ) || [];

      if (normalNodes.length > 0) {
        const last = normalNodes[normalNodes.length - 1];
        x = last.position_x + 350;
        y = last.position_y;
      }

      await db.nodes.add({
        id: newId,
        project_id: projectId,
        type,
        label: baseLabel,
        status: "Empty",
        position_x: x,
        position_y: y,
        sort_order: dbNodes.length + 1,
        updated_at: new Date().toISOString(),
      });
    },
    [dbNodes, projectId],
  );

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

      await db.nodes.delete(nodeId);

      const contents = await db.nodeContents
        .where({ node_id: nodeId })
        .toArray();
      await db.nodeContents.bulkDelete(contents.map((content) => content.id));

      const tasks = await db.tasks.where({ source_node_id: nodeId }).toArray();
      await db.tasks.bulkDelete(tasks.map((task) => task.id));

      if (selectedNodeData?.id === nodeId) {
        setSelectedNodeData(null);
      }

      setDeleteNodeState(null);
    } finally {
      setIsDeletingNode(false);
    }
  }, [deleteNodeState, selectedNodeData]);

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
        <header className="workspace-header z-20 border-b border-border/70 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={() => router.push("/")}
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold sm:text-xl">
                    {project.name}
                  </h1>
                  <span
                    className={getMetricPillClass(projectProgressMeta.tone)}
                  >
                    {projectProgressMeta.label}
                  </span>
                  {recommendedNextNode && (
                    <span className="metric-pill metric-pill--success">
                      Next: {recommendedNextNode.label}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm leading-6 text-muted-foreground">
                  <span>
                    {doneCount}/{dbNodes.length} nodes completed
                  </span>
                  <span>•</span>
                  <span>{progressPercent}% progress</span>
                  {recommendedNextNode && (
                    <>
                      <span>•</span>
                      <span>
                        Continue with{" "}
                        <span className="font-medium text-foreground">
                          {recommendedNextNode.label}
                        </span>
                      </span>
                    </>
                  )}
                </div>

                <div className="w-full max-w-sm">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full"
                onClick={handleJumpToRecommendedNode}
                disabled={!recommendedNextNode}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Next Node
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full"
                onClick={() => setShowCommandDialog(true)}
              >
                <Command className="mr-2 h-4 w-4" />
                Search / Jump
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full"
                onClick={handleFitView}
              >
                <Maximize className="mr-2 h-4 w-4" />
                Fit View
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full"
                onClick={() => setShowHelpDialog(true)}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full"
                onClick={() => setShowValidationPanel((value) => !value)}
              >
                {validationTone === "danger" ? (
                  <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                ) : validationTone === "warning" ? (
                  <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                )}
                Validation
                <span className="ml-2 text-readable-xs text-muted-foreground">
                  {errorCount}E · {warningCount}W · {infoCount}I
                </span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Node
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {(() => {
                    const existingTypes = new Set(
                      dbNodes.map((node) => node.type),
                    );
                    const addableNodes: { type: string; label: string }[] = [
                      { type: "project_brief", label: "Project Brief" },
                      { type: "requirements", label: "Requirements" },
                      { type: "user_stories", label: "User Stories" },
                      { type: "use_cases", label: "Use Cases" },
                      { type: "flowchart", label: "Flowchart" },
                      { type: "dfd", label: "DFD" },
                      { type: "erd", label: "ERD" },
                      { type: "sequence", label: "Sequence Diagram" },
                      { type: "task_board", label: "Task Board" },
                      { type: "summary", label: "Summary" },
                    ];

                    const available = addableNodes.filter(
                      (node) => !existingTypes.has(node.type),
                    );

                    return (
                      <>
                        <DropdownMenuItem
                          onClick={() =>
                            handleAddNode("custom", "Custom Notes")
                          }
                        >
                          Blank Notes
                        </DropdownMenuItem>
                        {available.length > 0 &&
                          available.map((node) => (
                            <DropdownMenuItem
                              key={node.type}
                              onClick={() =>
                                handleAddNode(node.type, node.label)
                              }
                            >
                              {node.label}
                            </DropdownMenuItem>
                          ))}
                      </>
                    );
                  })()}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      exportProjectToMarkdown(project, dbNodes, dbContents)
                    }
                  >
                    Export Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportProjectToPDF(project, dbNodes, dbContents)
                    }
                  >
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedNodeData && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full"
                  onClick={() => setEditorCollapsed((value) => !value)}
                >
                  <PanelRight className="mr-2 h-4 w-4" />
                  {editorCollapsed ? "Show Panel" : "Hide Panel"}
                </Button>
              )}

              <ModeToggle />
            </div>
          </div>
        </header>

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

          {showOnboarding && (
            <div className="pointer-events-none absolute left-3 top-3 z-20 w-[min(460px,calc(100vw-1.5rem))] max-w-full md:left-4 md:top-4">
              <div className="onboarding-card pointer-events-auto rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full px-2.5 py-1 text-readable-xs">
                        Getting started
                      </Badge>
                      {recommendedNextNode && (
                        <span className="metric-pill metric-pill--success">
                          Start with {recommendedNextNode.label}
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-base font-semibold">
                        Welcome to your architecture workspace
                      </h2>
                      <p className="mt-1 text-sm leading-7 text-muted-foreground">
                        Click a node to edit it, drag nodes to reorganize your
                        flow, and use{" "}
                        <span className="font-medium text-foreground">
                          Space + drag
                        </span>{" "}
                        to pan. You can use the Guided tab as the main source of
                        truth, jump to the next unfinished node, and reopen help
                        anytime from the header.
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                        <p className="font-medium text-foreground">
                          Open nodes
                        </p>
                        <p className="mt-1 leading-6">
                          Click any node to open the editor panel.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                        <p className="font-medium text-foreground">
                          Navigate faster
                        </p>
                        <p className="mt-1 leading-6">
                          Use Search / Jump, Next Node, Fit View, and
                          Validation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={dismissOnboarding}
                    aria-label="Dismiss onboarding"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-45" />
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-readable-xs text-muted-foreground">
                    You can reopen guidance anytime from the Help button.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setShowHelpDialog(true)}
                    >
                      Open Help
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={dismissOnboarding}
                    >
                      Got it
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

            <div className="pointer-events-none absolute right-4 top-4 z-20 hidden md:block">
              <div className="onboarding-card rounded-2xl px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-readable-xs text-muted-foreground">
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                    ⌘K / Ctrl+K search
                  </span>
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                    N next node
                  </span>
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                    F fit view
                  </span>
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                    ? help
                  </span>
                </div>
              </div>
            </div>
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

          {!selectedNodeData && recommendedNextNode && (
            <div className="pointer-events-none absolute bottom-4 right-4 z-20 hidden max-w-sm md:block">
              <div className="onboarding-card rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Suggested next step</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Open{" "}
                      <span className="font-medium text-foreground">
                        {recommendedNextNode.label}
                      </span>{" "}
                      to keep your documentation flow moving.
                    </p>
                    <div className="pointer-events-auto pt-1">
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={handleJumpToRecommendedNode}
                      >
                        Open next node
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showValidationPanel && dbWarnings.length > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden md:block">
              <div className="onboarding-card rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm text-muted-foreground">
                    You have{" "}
                    <span className="font-medium text-foreground">
                      {dbWarnings.length} validation issue(s)
                    </span>
                    . Open the validation drawer to review them.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!showValidationPanel &&
            dbWarnings.length === 0 &&
            dbNodes.length > 0 && (
              <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden md:block">
                <div className="onboarding-card rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-muted-foreground">
                      Cross-node validation is clear right now.
                    </p>
                  </div>
                </div>
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
