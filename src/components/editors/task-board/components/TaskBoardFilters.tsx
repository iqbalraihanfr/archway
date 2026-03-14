"use client";

import { Search, Plus, Download, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  GroupingMode,
  StatusFilter,
  PriorityFilter,
  SourceFilter,
} from "../types";

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
        "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all",
        active
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border/70 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

interface TaskBoardFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  grouping: GroupingMode;
  onGroupingChange: (mode: GroupingMode) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityChange: (priority: PriorityFilter) => void;
  sourceFilter: SourceFilter;
  onSourceChange: (source: SourceFilter) => void;
  sourceOptions: { id: string; label: string }[];
  onAddTask: () => void;
  onExport: (format: string) => void;
}

import { useMemo, useState } from "react";

export function TaskBoardFilters({
  searchQuery,
  onSearchChange,
  grouping,
  onGroupingChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  sourceFilter,
  onSourceChange,
  sourceOptions,
  onAddTask,
  onExport,
}: TaskBoardFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (priorityFilter !== "all") count++;
    if (sourceFilter !== "all") count++;
    return count;
  }, [statusFilter, priorityFilter, sourceFilter]);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search tasks..."
              className="h-10 rounded-xl pl-9 text-xs bg-background/50 border-border/60"
            />
          </div>
          <Select
            value={grouping}
            onValueChange={(value) => onGroupingChange(value as GroupingMode)}
          >
            <SelectTrigger className="h-10 min-w-[140px] rounded-xl text-xs bg-background/50 border-border/60">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="layer">Layer</SelectItem>
              <SelectItem value="source">Source</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="flat">Flat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAddTask}
            className="h-10 px-4 rounded-xl border-border/60 bg-background/50 hover:bg-background"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-4 rounded-xl border-border/60 bg-background/50 hover:bg-background"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="rounded-xl p-1 shadow-lg">
              <DropdownMenuItem onClick={() => onExport("md")}>Markdown Checklist</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("csv")}>CSV (Spreadsheet)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("linear")}>CSV (Linear Import)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("json")}>JSON File</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className={`h-10 px-4 rounded-xl border-border/60 bg-background/50 flex items-center gap-2 ${showFilters ? "bg-primary/5 border-primary/20" : ""}`}
          >
            <Filter className={`h-4 w-4 ${activeFilterCount > 0 ? "text-primary" : ""}`} />
            {activeFilterCount > 0 && !showFilters && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 shadow-inner animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "todo", "in_progress", "done"] as StatusFilter[]).map((f) => (
                  <FilterChip key={f} active={statusFilter === f} onClick={() => onStatusChange(f)}>
                    {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f === "todo" ? "To Do" : "Done"}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Priority</p>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "must", "should", "could", "wont"] as PriorityFilter[]).map((f) => (
                  <FilterChip key={f} active={priorityFilter === f} onClick={() => onPriorityChange(f)}>
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Source</p>
              <Select value={sourceFilter} onValueChange={(value) => onSourceChange(value as SourceFilter)}>
                <SelectTrigger className="h-8 rounded-lg text-[11px] bg-background border-border/50">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual">Manual Tasks</SelectItem>
                  {sourceOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
