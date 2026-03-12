import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Command,
  Download,
  HelpCircle,
  Maximize,
  PanelRight,
  Plus,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/mode-toggle";

import type { Project, NodeData, NodeContent } from "@/lib/db";
import { exportProjectToMarkdown, exportProjectToPDF } from "@/lib/exportEngine";

import {
  type ValidationTone,
  getMetricPillClass,
  formatRelativeProjectState,
} from "../../utils";

interface WorkspaceHeaderProps {
  project: Project;
  dbNodes: NodeData[];
  dbContents: NodeContent[];
  doneCount: number;
  progressPercent: number;
  recommendedNextNode: NodeData | null;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  selectedNodeData: NodeData | null;
  editorCollapsed: boolean;
  validationTone: ValidationTone;
  onJumpNext: () => void;
  onShowCommand: () => void;
  onFitView: () => void;
  onShowHelp: () => void;
  onToggleValidation: () => void;
  onAddNode: (type: string, label: string) => void;
  onToggleEditor: () => void;
}

export function WorkspaceHeader({
  project,
  dbNodes,
  dbContents,
  doneCount,
  progressPercent,
  recommendedNextNode,
  errorCount,
  warningCount,
  infoCount,
  selectedNodeData,
  editorCollapsed,
  validationTone,
  onJumpNext,
  onShowCommand,
  onFitView,
  onShowHelp,
  onToggleValidation,
  onAddNode,
  onToggleEditor,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const projectProgressMeta = formatRelativeProjectState(doneCount, dbNodes.length);

  return (
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
              <span className={getMetricPillClass(projectProgressMeta.tone)}>
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
            onClick={onJumpNext}
            disabled={!recommendedNextNode}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Next Node
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
            onClick={onShowCommand}
          >
            <Command className="mr-2 h-4 w-4" />
            Search / Jump
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
            onClick={onFitView}
          >
            <Maximize className="mr-2 h-4 w-4" />
            Fit View
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
            onClick={onShowHelp}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
            onClick={onToggleValidation}
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
                <Button variant="outline" size="sm" className="h-9 rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Node
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {(() => {
                const existingTypes = new Set(dbNodes.map((node) => node.type));
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
                      onClick={() => onAddNode("custom", "Custom Notes")}
                    >
                      Blank Notes
                    </DropdownMenuItem>
                    {available.length > 0 &&
                      available.map((node) => (
                        <DropdownMenuItem
                          key={node.type}
                          onClick={() => onAddNode(node.type, node.label)}
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
                <Button variant="outline" size="sm" className="h-9 rounded-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => exportProjectToMarkdown(project, dbNodes, dbContents)}
              >
                Export Markdown
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportProjectToPDF(project, dbNodes, dbContents)}
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
              onClick={onToggleEditor}
            >
              <PanelRight className="mr-2 h-4 w-4" />
              {editorCollapsed ? "Show Panel" : "Hide Panel"}
            </Button>
          )}

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
