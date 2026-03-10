"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { db, TaskData, NodeData } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  X,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  AlertTriangle,
  Filter,
  ListChecks,
  Search,
} from "lucide-react";
import { generateTasksFromNode, detectDuplicateTasks } from "@/lib/taskEngine";
import {
  exportTasksToCSV,
  exportTasksToJSON,
  exportTasksToLinearCSV,
  exportTasksToMarkdown,
} from "@/lib/exportEngine";

type GroupingMode = "flat" | "source" | "layer" | "priority" | "story";
type StatusFilter = "all" | "todo" | "in_progress" | "done";
type PriorityFilter = "all" | "must" | "should" | "could" | "wont";
type SourceFilter = "all" | "manual" | string;

const PRIORITY_ORDER: Record<string, number> = {
  must: 0,
  should: 1,
  could: 2,
  wont: 3,
};

function normalizePriority(priority: TaskData["priority"]) {
  return String(priority).toLowerCase() as PriorityFilter;
}

function priorityLabel(priority: string) {
  switch (priority.toLowerCase()) {
    case "must":
      return "Must";
    case "should":
      return "Should";
    case "could":
      return "Could";
    case "wont":
      return "Won't";
    default:
      return priority;
  }
}

function statusLabel(status: TaskData["status"]) {
  switch (status) {
    case "todo":
      return "To do";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    default:
      return status;
  }
}

function getPriorityBadgeClass(priority: string) {
  switch (priority.toLowerCase()) {
    case "must":
      return "metric-pill metric-pill--danger";
    case "should":
      return "metric-pill metric-pill--warning";
    case "could":
      return "metric-pill metric-pill--info";
    default:
      return "metric-pill";
  }
}

function getStatusBadgeClass(status: TaskData["status"]) {
  switch (status) {
    case "done":
      return "metric-pill metric-pill--success";
    case "in_progress":
      return "metric-pill metric-pill--warning";
    default:
      return "metric-pill metric-pill--info";
  }
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <p className="text-readable-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-readable-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/70 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function TaskBoardEditor({
  node,
  onCloseAction,
}: {
  node: NodeData;
  onCloseAction: () => void;
}) {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [grouping, setGrouping] = useState<GroupingMode>("layer");
  const [duplicates, setDuplicates] = useState<[number, number, number][]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const loadTasks = useCallback(async () => {
    const [projectTasks, projectNodes] = await Promise.all([
      db.tasks.where({ project_id: node.project_id }).toArray(),
      db.nodes.where({ project_id: node.project_id }).toArray(),
    ]);

    const sorted = [...projectTasks].sort((a, b) => {
      const priorityA = PRIORITY_ORDER[normalizePriority(a.priority)] ?? 99;
      const priorityB = PRIORITY_ORDER[normalizePriority(b.priority)] ?? 99;

      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.sort_order - b.sort_order;
    });

    setTasks(sorted);
    setNodes(projectNodes);
    setDuplicates(detectDuplicateTasks(sorted));
  }, [node.project_id]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const sourceOptions = useMemo(() => {
    const map = new Map<string, string>();

    nodes.forEach((sourceNode) => {
      map.set(sourceNode.id, sourceNode.label);
    });

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [nodes]);

  const taskSummary = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === "done").length;
    const inProgress = tasks.filter(
      (task) => task.status === "in_progress",
    ).length;
    const manual = tasks.filter((task) => task.is_manual).length;
    const autoGenerated = total - manual;
    const mustHave = tasks.filter(
      (task) => normalizePriority(task.priority) === "must",
    ).length;

    return {
      total,
      done,
      inProgress,
      manual,
      autoGenerated,
      mustHave,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const sourceNodeLabel = task.source_node_id
        ? (nodes.find((sourceNode) => sourceNode.id === task.source_node_id)
            ?.label ?? "Unknown Source")
        : "Manual Tasks";

      const matchesSearch =
        normalizedQuery.length === 0 ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.description.toLowerCase().includes(normalizedQuery) ||
        task.group_key.toLowerCase().includes(normalizedQuery) ||
        sourceNodeLabel.toLowerCase().includes(normalizedQuery) ||
        task.labels.some((label) =>
          label.toLowerCase().includes(normalizedQuery),
        );

      const matchesStatus =
        statusFilter === "all" ? true : task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all"
          ? true
          : normalizePriority(task.priority) === priorityFilter;

      const matchesSource =
        sourceFilter === "all"
          ? true
          : sourceFilter === "manual"
            ? task.source_node_id === null
            : task.source_node_id === sourceFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesSource;
    });
  }, [nodes, priorityFilter, searchQuery, sourceFilter, statusFilter, tasks]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskData[]> = {};

    if (grouping === "flat") {
      return { "All Tasks": filteredTasks };
    }

    filteredTasks.forEach((task) => {
      let key = "Other";

      if (grouping === "source") {
        key = task.source_node_id
          ? (nodes.find((sourceNode) => sourceNode.id === task.source_node_id)
              ?.label ?? "Unknown Source")
          : "Manual Tasks";
      }

      if (grouping === "layer") {
        key = task.group_key || "Other";
      }

      if (grouping === "priority") {
        key = priorityLabel(task.priority);
      }

      if (grouping === "story") {
        const sid = task.source_item_id || "";
        const storyMatch = sid.match(/^story-(\d+)/);
        key = storyMatch
          ? `US-${String(Number(storyMatch[1]) + 1).padStart(3, "0")}`
          : task.group_key || "Other";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return Object.fromEntries(
      Object.entries(groups).sort(([groupA], [groupB]) =>
        groupA.localeCompare(groupB),
      ),
    );
  }, [filteredTasks, grouping, nodes]);

  const updateTask = async (id: string, updates: Partial<TaskData>) => {
    await db.tasks.update(id, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
    await loadTasks();
  };

  const deleteTask = async (id: string) => {
    await db.tasks.delete(id);
    await loadTasks();
  };

  const addManualTask = async () => {
    const now = new Date().toISOString();

    const newTask: TaskData = {
      id: crypto.randomUUID(),
      project_id: node.project_id,
      source_node_id: null,
      title: "New Manual Task",
      description: "",
      group_key: "Manual",
      priority: "should",
      status: "todo",
      labels: [],
      is_manual: true,
      sort_order: tasks.length,
      created_at: now,
      updated_at: now,
    };

    await db.tasks.add(newTask);
    await loadTasks();
  };

  const regenerateAllTasks = async () => {
    setIsRegenerating(true);

    try {
      const autoTasks = tasks.filter((task) => !task.is_manual);
      await db.tasks.bulkDelete(autoTasks.map((task) => task.id));

      const allContents = await db.nodeContents.toArray();
      const allParsedTasks: TaskData[] = [];
      const now = new Date().toISOString();

      for (const sourceNode of nodes) {
        const content = allContents.find(
          (item) => item.node_id === sourceNode.id,
        );
        if (!content) continue;

        const generated = generateTasksFromNode(
          sourceNode,
          content,
          node.project_id,
        );

        const mapped = generated.map((task, index) => ({
          ...task,
          id: crypto.randomUUID(),
          sort_order: index,
          created_at: now,
          updated_at: now,
        }));

        allParsedTasks.push(...mapped);
      }

      if (allParsedTasks.length > 0) {
        await db.tasks.bulkAdd(allParsedTasks);
      }

      setShowRegenConfirm(false);
      await loadTasks();
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex h-full w-[680px] shrink-0 flex-col border-l border-border/70 bg-card shadow-[-10px_0_24px_-10px_rgba(0,0,0,0.12)]">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-readable-xs font-medium text-muted-foreground">
                Task Board
              </span>
              <span className="metric-pill metric-pill--info">
                Execution planning
              </span>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Task Board
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Review generated work items, refine manual tasks, and filter the
                board before export.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseAction}
            className="rounded-full hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b border-border/70 bg-muted/10 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Total tasks"
            value={taskSummary.total}
            helper={`${taskSummary.autoGenerated} auto · ${taskSummary.manual} manual`}
          />
          <SummaryCard
            label="Active work"
            value={taskSummary.inProgress}
            helper={`${taskSummary.done} completed so far`}
          />
          <SummaryCard
            label="Must priority"
            value={taskSummary.mustHave}
            helper="High-priority implementation items"
          />
        </div>
      </div>

      <div className="border-b border-border/70 px-5 py-4">
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks, groups, source nodes, or labels..."
                className="h-10 rounded-2xl pl-10 text-sm"
              />
            </div>

            <Select
              value={grouping}
              onValueChange={(value) => setGrouping(value as GroupingMode)}
            >
              <SelectTrigger className="h-10 min-w-[170px] rounded-2xl text-sm">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="layer">
                  Group by architecture layer
                </SelectItem>
                <SelectItem value="source">Group by source node</SelectItem>
                <SelectItem value="story">Group by user story</SelectItem>
                <SelectItem value="priority">Group by priority</SelectItem>
                <SelectItem value="flat">Flat list</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={addManualTask}
              className="h-10 rounded-full"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Task
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-full"
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Export
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => exportTasksToMarkdown(tasks, "Archway-Tasks")}
                >
                  Markdown Checklist
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportTasksToCSV(tasks, "Archway")}
                >
                  CSV (Spreadsheet)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportTasksToLinearCSV(tasks, "Archway")}
                >
                  CSV (Linear Import)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportTasksToJSON(tasks, "Archway")}
                >
                  JSON File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
            <div className="mb-3 flex items-center gap-2 text-readable-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="mb-2 text-readable-xs font-medium text-foreground">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={statusFilter === "all"}
                    onClick={() => setStatusFilter("all")}
                  >
                    All
                  </FilterChip>
                  <FilterChip
                    active={statusFilter === "todo"}
                    onClick={() => setStatusFilter("todo")}
                  >
                    To do
                  </FilterChip>
                  <FilterChip
                    active={statusFilter === "in_progress"}
                    onClick={() => setStatusFilter("in_progress")}
                  >
                    In progress
                  </FilterChip>
                  <FilterChip
                    active={statusFilter === "done"}
                    onClick={() => setStatusFilter("done")}
                  >
                    Done
                  </FilterChip>
                </div>
              </div>

              <div>
                <p className="mb-2 text-readable-xs font-medium text-foreground">
                  Priority
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={priorityFilter === "all"}
                    onClick={() => setPriorityFilter("all")}
                  >
                    All
                  </FilterChip>
                  <FilterChip
                    active={priorityFilter === "must"}
                    onClick={() => setPriorityFilter("must")}
                  >
                    Must
                  </FilterChip>
                  <FilterChip
                    active={priorityFilter === "should"}
                    onClick={() => setPriorityFilter("should")}
                  >
                    Should
                  </FilterChip>
                  <FilterChip
                    active={priorityFilter === "could"}
                    onClick={() => setPriorityFilter("could")}
                  >
                    Could
                  </FilterChip>
                  <FilterChip
                    active={priorityFilter === "wont"}
                    onClick={() => setPriorityFilter("wont")}
                  >
                    Won&apos;t
                  </FilterChip>
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-readable-xs font-medium text-foreground">
                  Source
                </Label>
                <Select
                  value={sourceFilter}
                  onValueChange={(value) =>
                    setSourceFilter(value as SourceFilter)
                  }
                >
                  <SelectTrigger className="h-10 rounded-2xl text-sm">
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="manual">Manual tasks</SelectItem>
                    {sourceOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-readable-xs text-muted-foreground">
                {filteredTasks.length} visible
              </span>
              {duplicates.length > 0 && (
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-readable-xs text-amber-700 dark:text-amber-400">
                  {duplicates.length} duplicate warning(s)
                </span>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => setShowRegenConfirm(true)}
              disabled={isRegenerating}
              className="rounded-full"
            >
              <RefreshCw
                className={`mr-1.5 h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
              />
              Regenerate Auto Tasks
            </Button>
          </div>
        </div>
      </div>

      <div className="workspace-scroll flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-6">
          {duplicates.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Potential duplicates detected
                </h3>
              </div>

              <div className="mt-3 space-y-2">
                {duplicates.map(([idxA, idxB, score], index) => (
                  <div
                    key={`${idxA}-${idxB}-${index}`}
                    className="rounded-xl border border-border/60 bg-background/70 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tasks[idxA]?.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Similar to {tasks[idxB]?.title}
                        </p>
                      </div>
                      <span className="rounded-full bg-background px-2.5 py-1 text-readable-xs text-muted-foreground">
                        {score}% similarity
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Open your documentation nodes and add structured content, then regenerate to create implementation-ready tasks."
            />
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              title="No matching tasks"
              description="Try a different search or relax the active filters to reveal more tasks."
            />
          ) : (
            Object.entries(groupedTasks).map(([groupName, groupItems]) => (
              <section key={groupName} className="space-y-3">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/70 bg-card/95 py-2 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {groupName}
                    </h3>
                  </div>
                  <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-readable-xs text-muted-foreground">
                    {groupItems.length} task(s)
                  </span>
                </div>

                <div className="space-y-3">
                  {groupItems.map((task) => {
                    const sourceNodeLabel = task.source_node_id
                      ? (nodes.find(
                          (sourceNode) => sourceNode.id === task.source_node_id,
                        )?.label ?? "Unknown Source")
                      : "Manual Tasks";

                    return (
                      <div
                        key={task.id}
                        className="rounded-2xl border border-border/70 bg-background px-4 py-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={getPriorityBadgeClass(
                                    task.priority,
                                  )}
                                >
                                  {priorityLabel(task.priority)}
                                </span>
                                <span
                                  className={getStatusBadgeClass(task.status)}
                                >
                                  {statusLabel(task.status)}
                                </span>
                                <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-readable-xs text-muted-foreground">
                                  {task.is_manual ? "Manual" : "Auto-generated"}
                                </span>
                                <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-readable-xs text-muted-foreground">
                                  Source: {sourceNodeLabel}
                                </span>
                              </div>

                              <Input
                                value={task.title}
                                onChange={(event) =>
                                  updateTask(task.id, {
                                    title: event.target.value,
                                  })
                                }
                                className="h-10 border-border/70 text-sm font-semibold"
                              />
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTask(task.id)}
                              className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                            <div className="space-y-2">
                              <Label className="text-readable-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Description
                              </Label>
                              <Textarea
                                value={task.description}
                                onChange={(event) =>
                                  updateTask(task.id, {
                                    description: event.target.value,
                                  })
                                }
                                className="min-h-[96px] resize-none text-sm leading-6"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-readable-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Priority
                              </Label>
                              <Select
                                value={normalizePriority(task.priority)}
                                onValueChange={(value) =>
                                  updateTask(task.id, {
                                    priority: value as TaskData["priority"],
                                  })
                                }
                              >
                                <SelectTrigger className="h-10 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="must">Must</SelectItem>
                                  <SelectItem value="should">Should</SelectItem>
                                  <SelectItem value="could">Could</SelectItem>
                                  <SelectItem value="wont">
                                    Won&apos;t
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-readable-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Status
                              </Label>
                              <Select
                                value={task.status}
                                onValueChange={(value) =>
                                  updateTask(task.id, {
                                    status: value as TaskData["status"],
                                  })
                                }
                              >
                                <SelectTrigger className="h-10 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todo">To do</SelectItem>
                                  <SelectItem value="in_progress">
                                    In progress
                                  </SelectItem>
                                  <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showRegenConfirm}
        onOpenChange={setShowRegenConfirm}
        title="Regenerate auto-generated tasks"
        description="This will remove and rebuild all auto-generated tasks from the latest node content. Manual tasks will be preserved."
        confirmLabel="Regenerate tasks"
        cancelLabel="Cancel"
        variant="default"
        loading={isRegenerating}
        onConfirm={regenerateAllTasks}
      />
    </div>
  );
}
