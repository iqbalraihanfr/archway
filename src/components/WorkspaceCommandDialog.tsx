"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Command,
  Search,
  Sparkles,
  Keyboard,
  MoveRight,
  Maximize,
  ZoomIn,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type WorkspaceCommandNode = {
  id: string;
  label: string;
  type: string;
  status: "Empty" | "In Progress" | "Done";
  isNext?: boolean;
};

type WorkspaceCommandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: WorkspaceCommandNode[];
  validationCount?: number;
  onNodeSelect: (nodeId: string) => void;
  onNextNode?: () => void;
  onFitView?: () => void;
  onShowValidation?: () => void;
};

type CommandAction = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  onSelect: () => void;
};

const STATUS_TONE: Record<WorkspaceCommandNode["status"], string> = {
  Empty: "bg-muted text-muted-foreground",
  "In Progress":
    "bg-[color:color-mix(in_oklch,var(--status-warning)_14%,transparent)] text-[var(--status-warning)]",
  Done: "bg-[color:color-mix(in_oklch,var(--status-success)_14%,transparent)] text-[var(--status-success)]",
};

const TYPE_LABELS: Record<string, string> = {
  project_brief: "Project Brief",
  requirements: "Requirements",
  user_stories: "User Stories",
  use_cases: "Use Cases",
  flowchart: "Flowchart",
  dfd: "DFD",
  erd: "ERD",
  sequence: "Sequence",
  task_board: "Task Board",
  summary: "Summary",
  custom: "Notes",
};

function matchesQuery(haystack: string[], query: string) {
  if (!query.trim()) return true;
  const normalized = query.trim().toLowerCase();
  return haystack.some((value) => value.toLowerCase().includes(normalized));
}

export function WorkspaceCommandDialog({
  open,
  onOpenChange,
  nodes,
  validationCount = 0,
  onNodeSelect,
  onNextNode,
  onFitView,
  onShowValidation,
}: WorkspaceCommandDialogProps) {
  const [query, setQuery] = useState("");

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setQuery("");
      }

      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const actions = useMemo<CommandAction[]>(() => {
    const items: CommandAction[] = [];

    if (onNextNode) {
      items.push({
        id: "next-node",
        label: "Go to next unfinished node",
        description: "Jump straight to the recommended next step.",
        keywords: ["next", "unfinished", "recommended", "continue"],
        icon: MoveRight,
        badge: "N",
        onSelect: () => {
          onNextNode();
          handleOpenChange(false);
        },
      });
    }

    if (onFitView) {
      items.push({
        id: "fit-view",
        label: "Fit canvas to view",
        description: "Recenter and zoom the workspace canvas.",
        keywords: ["fit", "canvas", "view", "center", "zoom"],
        icon: Maximize,
        badge: "F",
        onSelect: () => {
          onFitView();
          handleOpenChange(false);
        },
      });
    }

    if (onShowValidation) {
      items.push({
        id: "validation",
        label: "Open validation summary",
        description:
          validationCount > 0
            ? `Review ${validationCount} current issue(s).`
            : "Review cross-node validation status.",
        keywords: ["validation", "issues", "warnings", "errors"],
        icon: AlertTriangle,
        badge: validationCount > 0 ? String(validationCount) : undefined,
        onSelect: () => {
          onShowValidation();
          handleOpenChange(false);
        },
      });
    }

    return items;
  }, [
    handleOpenChange,
    onFitView,
    onNextNode,
    onShowValidation,
    validationCount,
  ]);

  const filteredActions = useMemo(() => {
    return actions.filter((action) =>
      matchesQuery(
        [action.label, action.description, ...action.keywords],
        query,
      ),
    );
  }, [actions, query]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) =>
      matchesQuery(
        [
          node.label,
          node.type,
          TYPE_LABELS[node.type] ?? node.type,
          node.status,
          node.isNext ? "next recommended" : "",
        ],
        query,
      ),
    );
  }, [nodes, query]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Command className="h-5 w-5 text-primary" />
            Workspace Command Menu
          </DialogTitle>
          <DialogDescription className="text-readable-xs sm:text-sm">
            Search nodes, jump to the next unfinished step, and access workspace
            shortcuts quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search nodes, actions, or shortcuts..."
              className="h-11 rounded-2xl pl-10 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <Keyboard className="mr-1.5 h-3.5 w-3.5" />
              ⌘K / Ctrl+K
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <MoveRight className="mr-1.5 h-3.5 w-3.5" />N = next node
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <Maximize className="mr-1.5 h-3.5 w-3.5" />F = fit view
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <ZoomIn className="mr-1.5 h-3.5 w-3.5" />/ = search
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Quick actions</h3>
                <span className="text-readable-xs text-muted-foreground">
                  {filteredActions.length} visible
                </span>
              </div>

              <div className="space-y-2">
                {filteredActions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                    No matching actions.
                  </div>
                ) : (
                  filteredActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={action.onSelect}
                        className="flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {action.label}
                            </p>
                            {action.badge ? (
                              <span className="metric-pill metric-pill--info">
                                {action.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-readable-xs leading-5 text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Nodes</h3>
                <span className="text-readable-xs text-muted-foreground">
                  {filteredNodes.length} visible
                </span>
              </div>

              <div className="workspace-scroll max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {filteredNodes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                    No matching nodes.
                  </div>
                ) : (
                  filteredNodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        onNodeSelect(node.id);
                        handleOpenChange(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        {node.isNext ? (
                          <Sparkles className="h-4 w-4 text-primary" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {node.label}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-medium",
                              STATUS_TONE[node.status],
                            )}
                          >
                            {node.status}
                          </span>
                          {node.isNext ? (
                            <span className="metric-pill metric-pill--success">
                              Recommended
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-readable-xs text-muted-foreground">
                          <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1">
                            {TYPE_LABELS[node.type] ?? node.type}
                          </span>
                          <span>Open editor panel</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-readable-xs leading-5 text-muted-foreground">
              Tip: use this menu when the canvas starts feeling crowded. It is
              the fastest way to navigate large architecture workspaces.
            </p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
