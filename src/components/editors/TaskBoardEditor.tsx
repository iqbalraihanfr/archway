"use client";

import { useMemo, useState } from "react";
import { NodeData, TaskData } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ListChecks,
} from "lucide-react";
import {
  exportTasksToCSV,
  exportTasksToJSON,
  exportTasksToLinearCSV,
  exportTasksToMarkdown,
} from "@/lib/exportEngine";

import { useTaskBoard } from "./task-board/hooks/useTaskBoard";
import { TaskBoardSummary } from "./task-board/components/TaskBoardSummary";
import { TaskBoardFilters } from "./task-board/components/TaskBoardFilters";
import { TaskItem } from "./task-board/components/TaskItem";
import { PriorityFilter } from "./task-board/types";

function priorityLabel(priority: string) {
  switch (priority.toLowerCase()) {
    case "must": return "Must";
    case "should": return "Should";
    case "could": return "Could";
    case "wont": return "Won't";
    default: return priority;
  }
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/80 bg-background/40 px-6 py-16 text-center shadow-inner">
      <h3 className="text-lg font-bold text-foreground/80">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-xs mx-auto">
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
  const {
    summary,
    filteredTasks,
    isRegenerating,
    grouping,
    setGrouping,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    sourceFilter,
    setSourceFilter,
    duplicates,
    sourceOptions,
    nodes,
    tasks,
    updateTask,
    deleteTask,
    addManualTask,
    regenerateAllTasks,
  } = useTaskBoard(node);

  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskData[]> = {};
    if (grouping === "flat") return { "All Tasks": filteredTasks };

    filteredTasks.forEach((task) => {
      let key = "Other";
      if (grouping === "feature") {
        key = task.feature_name || "General";
      } else if (grouping === "source") {
        key = task.source_node_id
          ? (nodes.find((sn) => sn.id === task.source_node_id)?.label ?? "Unknown Source")
          : "Manual Tasks";
      } else if (grouping === "layer") {
        key = task.group_key || "Other";
      } else if (grouping === "priority") {
        key = priorityLabel(task.priority);
      } else if (grouping === "story") {
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
      Object.entries(groups).sort(([a], [b]) => {
        if (grouping === "feature") {
          // Put P0 features first if possible, or just alpha
          return a.localeCompare(b);
        }
        return a.localeCompare(b);
      })
    );
  }, [filteredTasks, grouping, nodes]);

  const handleExport = (format: string) => {
    switch (format) {
      case "md": exportTasksToMarkdown(tasks, "Archway-Tasks"); break;
      case "csv": exportTasksToCSV(tasks, "Archway"); break;
      case "linear": exportTasksToLinearCSV(tasks, "Archway"); break;
      case "json": exportTasksToJSON(tasks, "Archway"); break;
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-card/40 backdrop-blur-md shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
      <div className="border-b border-border/70 px-6 py-6 bg-card/10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-readable-2xs font-bold uppercase tracking-widest text-primary">
                Task Board
              </span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-readable-2xs font-bold uppercase tracking-widest text-accent-foreground/70">
                Execution planning
              </span>
            </div>

            <div>
              <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Work Items
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground max-w-md">
                Review generated work items and refine manual tasks.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseAction}
            className="rounded-full h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="border-b border-border/60 bg-muted/10 px-6 py-3">
        <TaskBoardSummary summary={summary} />
      </div>

      <div className="border-b border-border/60 px-6 py-4 bg-card/5">
        <TaskBoardFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          grouping={grouping}
          onGroupingChange={setGrouping}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          sourceOptions={sourceOptions}
          onAddTask={addManualTask}
          onExport={handleExport}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-border/60 bg-background/50 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground/80">
              {filteredTasks.length} visible
            </span>
            {duplicates.length > 0 && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                {duplicates.length} duplicate(s)
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowRegenConfirm(true)}
            disabled={isRegenerating}
            className="rounded-full text-[10px] font-bold tracking-wide hover:bg-primary/5 hover:text-primary transition-colors h-7 px-3"
          >
            <RefreshCw className={`mr-1.5 h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
        </div>
      </div>

      <div className="workspace-scroll flex-1 overflow-y-auto px-10">
        <div className="space-y-12 max-w-4xl mx-auto">
          {duplicates.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm max-w-2xl px-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Duplicates Detected
                </h3>
              </div>
              <div className="mt-3 space-y-1.5">
                {duplicates.map(([idxA, idxB, score], index) => (
                  <div key={`${idxA}-${idxB}-${index}`} className="flex items-center justify-between px-2.5 py-1.5 bg-background/40 rounded-lg border border-border/40">
                    <span className="text-[11px] font-medium truncate max-w-[280px]">“{tasks[idxA]?.title}” ↔ “{tasks[idxB]?.title}”</span>
                    <span className="text-[9px] font-bold text-muted-foreground/60">{score}% match</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Fill out your project nodes with detailed requirements to generate implemention-ready work items."
            />
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              title="No tasks match your filters"
              description="Reset your filters or search terms to see the full implementation list."
            />
          ) : (
            Object.entries(groupedTasks).map(([groupName, groupItems]) => {
              const topTier = groupItems.find(t => t.priority_tier === "P0") ? "P0" : 
                            groupItems.find(t => t.priority_tier === "P1") ? "P1" : "P2";
              
              // Extract DoD items from the first task that has them (usually the Core task)
              const coreTask = groupItems.find(t => (t.dod_items || []).length > 0);
              const dod = coreTask?.dod_items || [];

              const handleToggleDoD = async (index: number) => {
                if (!coreTask) return;
                const newDod = [...dod];
                newDod[index] = { ...newDod[index], done: !newDod[index].done };
                await updateTask(coreTask.id, { dod_items: newDod });
              };

              return (
                <section key={groupName} className="space-y-6">
                  <div className="sticky top-0 z-10 bg-card/60 backdrop-blur-xl py-4 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl transition-all ${
                          topTier === "P0" ? "bg-red-500/10 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.1)]" :
                          topTier === "P1" ? "bg-amber-500/10 text-amber-600" :
                          "bg-blue-500/10 text-blue-600"
                        }`}>
                          <span className="text-xs font-black tracking-tighter">{topTier}</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-foreground tracking-tight">
                            {groupName}
                          </h3>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-muted-foreground/40 px-2 py-1 border border-border/40 rounded-lg bg-background/50">
                        {groupItems.length} items
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {groupItems.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        sourceNodeLabel={
                          task.source_node_id
                            ? (nodes.find((sn) => sn.id === task.source_node_id)?.label ?? "Unknown")
                            : "Manual"
                        }
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>

                  {dod.length > 0 && (
                    <div className="mt-8 rounded-[2rem] bg-muted/20 border border-border/40 p-8 space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground/60">
                        <ListChecks className="h-4 w-4" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Definition of Done</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        {dod.map((item, i) => (
                          <button 
                            key={i} 
                            onClick={() => handleToggleDoD(i)}
                            className="flex items-start gap-3 group text-left transition-all"
                          >
                            <span className={`mt-1 h-3.5 w-3.5 rounded border transition-colors shrink-0 flex items-center justify-center ${
                              item.done ? "bg-primary border-primary" : "border-border/60 group-hover:border-primary/40"
                            }`}>
                              {item.done && <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />}
                            </span>
                            <span className={`text-xs leading-relaxed transition-colors ${
                              item.done ? "text-muted-foreground/40 line-through" : "text-muted-foreground/70 group-hover:text-foreground"
                            }`}>
                              {item.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showRegenConfirm}
        onOpenChange={setShowRegenConfirm}
        title="Regenerate auto-generated tasks"
        description="This will remove all current auto-tasks and rebuild them from your documentation. Manual tasks stay safe. Continue?"
        confirmLabel="Regenerate Now"
        variant="default"
        loading={isRegenerating}
        onConfirm={regenerateAllTasks}
      />
    </div>
  );
}
