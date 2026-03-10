"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Filter,
  Info,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValidationWarning } from "@/lib/db";

type ValidationSummaryPanelProps = {
  warnings: ValidationWarning[];
  onCloseAction: () => void;
  onNodeNavigateAction: (nodeId: string) => void;
};

type SeverityFilter = "all" | "error" | "warning" | "info";
type ScopeFilter = "all" | "current-node-target" | "cross-node-only";

const NODE_TYPE_LABELS: Record<string, string> = {
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

function getSeverityClasses(tone: "error" | "warning" | "info" | "success") {
  if (tone === "error") {
    return {
      wrapper: "border-destructive/20 bg-destructive/10 text-destructive",
      iconWrap: "bg-destructive/15 text-destructive",
      title: "text-destructive",
    };
  }

  if (tone === "warning") {
    return {
      wrapper:
        "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      iconWrap: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
      title: "text-yellow-700 dark:text-yellow-400",
    };
  }

  if (tone === "info") {
    return {
      wrapper:
        "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      iconWrap: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
      title: "text-blue-700 dark:text-blue-400",
    };
  }

  return {
    wrapper:
      "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
    iconWrap: "bg-green-500/15 text-green-700 dark:text-green-400",
    title: "text-green-700 dark:text-green-400",
  };
}

function SeverityIcon({
  severity,
  className,
}: {
  severity: "error" | "warning" | "info" | "success";
  className?: string;
}) {
  if (severity === "error") return <AlertCircle className={className} />;
  if (severity === "warning") return <AlertTriangle className={className} />;
  if (severity === "info") return <Info className={className} />;
  return <CheckCircle2 className={className} />;
}

function getTargetLabel(targetNodeType?: string) {
  if (!targetNodeType) return "Current node";
  return NODE_TYPE_LABELS[targetNodeType] ?? targetNodeType;
}

function getActionLabel(warning: ValidationWarning) {
  const target = getTargetLabel(warning.target_node_type);

  if (warning.rule_id?.startsWith("REQ")) {
    return `Open Requirements`;
  }

  if (warning.target_node_type) {
    return `Open ${target}`;
  }

  return "Open source node";
}

function getIssueCategory(warning: ValidationWarning) {
  if (warning.rule_id?.startsWith("REQ")) return "Missing required content";
  if (warning.rule_id?.startsWith("CV")) return "Cross-node consistency";
  return "Validation issue";
}

function SeveritySummaryCard({
  label,
  count,
  tone,
  icon,
}: {
  label: string;
  count: number;
  tone: "error" | "warning" | "info" | "success";
  icon: React.ReactNode;
}) {
  const toneClasses = getSeverityClasses(tone);

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClasses.wrapper}`}>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background/75">
          {icon}
        </div>
        <div>
          <p className="text-readable-xs uppercase tracking-[0.16em] opacity-80">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none">{count}</p>
        </div>
      </div>
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
          : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/25 hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function IssueCard({
  warning,
  onNodeNavigateAction,
}: {
  warning: ValidationWarning;
  onNodeNavigateAction: (nodeId: string) => void;
}) {
  const toneClasses = getSeverityClasses(warning.severity);
  const issueCategory = getIssueCategory(warning);
  const targetLabel = getTargetLabel(warning.target_node_type);
  const actionLabel = getActionLabel(warning);
  const isCrossNode = Boolean(warning.target_node_type);

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${toneClasses.wrapper}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses.iconWrap}`}
        >
          <SeverityIcon severity={warning.severity} className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-semibold ${toneClasses.title}`}>
              {warning.message}
            </p>
            <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {warning.severity}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-background/75 px-2 py-1 font-medium">
              {issueCategory}
            </span>
            <span className="rounded-full bg-background/75 px-2 py-1">
              Scope: {isCrossNode ? "Cross-node" : "Current node"}
            </span>
            <span className="rounded-full bg-background/75 px-2 py-1">
              Target: {targetLabel}
            </span>
            {warning.rule_id && (
              <span className="rounded-full bg-background/75 px-2 py-1 font-mono">
                Rule: {warning.rule_id}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Use the action below to jump back into the related node and
              resolve this issue.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => onNodeNavigateAction(warning.source_node_id)}
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ValidationSummaryPanel({
  warnings,
  onCloseAction,
  onNodeNavigateAction,
}: ValidationSummaryPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const errors = useMemo(
    () => warnings.filter((warning) => warning.severity === "error"),
    [warnings],
  );
  const warns = useMemo(
    () => warnings.filter((warning) => warning.severity === "warning"),
    [warnings],
  );
  const infos = useMemo(
    () => warnings.filter((warning) => warning.severity === "info"),
    [warnings],
  );

  const filteredWarnings = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return warnings.filter((warning) => {
      const matchesSeverity =
        severityFilter === "all" || warning.severity === severityFilter;

      const matchesScope =
        scopeFilter === "all"
          ? true
          : scopeFilter === "current-node-target"
            ? !warning.target_node_type
            : Boolean(warning.target_node_type);

      const matchesSearch =
        normalizedQuery.length === 0 ||
        warning.message.toLowerCase().includes(normalizedQuery) ||
        warning.rule_id?.toLowerCase().includes(normalizedQuery) ||
        warning.target_node_type?.toLowerCase().includes(normalizedQuery) ||
        getIssueCategory(warning).toLowerCase().includes(normalizedQuery) ||
        getTargetLabel(warning.target_node_type)
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesSeverity && matchesScope && matchesSearch;
    });
  }, [scopeFilter, searchQuery, severityFilter, warnings]);

  const groupedSections = useMemo(() => {
    const groups = [
      {
        key: "errors",
        title: "Errors",
        severity: "error" as const,
        items: filteredWarnings.filter(
          (warning) => warning.severity === "error",
        ),
        toneClass: "text-destructive",
      },
      {
        key: "warnings",
        title: "Warnings",
        severity: "warning" as const,
        items: filteredWarnings.filter(
          (warning) => warning.severity === "warning",
        ),
        toneClass: "text-yellow-700 dark:text-yellow-400",
      },
      {
        key: "infos",
        title: "Info",
        severity: "info" as const,
        items: filteredWarnings.filter(
          (warning) => warning.severity === "info",
        ),
        toneClass: "text-blue-700 dark:text-blue-400",
      },
    ];

    return groups.filter((section) => section.items.length > 0);
  }, [filteredWarnings]);

  const hasIssues = warnings.length > 0;
  const hasFilteredResults = filteredWarnings.length > 0;

  return (
    <aside className="workspace-drawer workspace-scroll flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/70">
      <div className="border-b border-border/70 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Validation Summary
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Review, filter, and jump straight to node-level issues before
                  export or implementation.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                {warnings.length} total issue(s)
              </span>
              <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                {errors.length} errors
              </span>
              <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                {warns.length} warnings
              </span>
              <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                {infos.length} info
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={onCloseAction}
            aria-label="Close validation panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search issues, rules, targets..."
              className="h-10 rounded-2xl pl-10 text-sm"
            />
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-2 text-readable-xs font-medium text-foreground">
                  Severity
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={severityFilter === "all"}
                    onClick={() => setSeverityFilter("all")}
                  >
                    All
                  </FilterChip>
                  <FilterChip
                    active={severityFilter === "error"}
                    onClick={() => setSeverityFilter("error")}
                  >
                    Errors
                  </FilterChip>
                  <FilterChip
                    active={severityFilter === "warning"}
                    onClick={() => setSeverityFilter("warning")}
                  >
                    Warnings
                  </FilterChip>
                  <FilterChip
                    active={severityFilter === "info"}
                    onClick={() => setSeverityFilter("info")}
                  >
                    Info
                  </FilterChip>
                </div>
              </div>

              <div>
                <p className="mb-2 text-readable-xs font-medium text-foreground">
                  Scope
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={scopeFilter === "all"}
                    onClick={() => setScopeFilter("all")}
                  >
                    All issues
                  </FilterChip>
                  <FilterChip
                    active={scopeFilter === "cross-node-only"}
                    onClick={() => setScopeFilter("cross-node-only")}
                  >
                    Cross-node only
                  </FilterChip>
                  <FilterChip
                    active={scopeFilter === "current-node-target"}
                    onClick={() => setScopeFilter("current-node-target")}
                  >
                    Current-node only
                  </FilterChip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="workspace-scroll flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {!hasIssues ? (
          <div className="flex h-full min-h-70 flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-background/60 px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">All clear</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              No cross-validation issues were found. Your current documentation
              flow looks consistent.
            </p>
          </div>
        ) : !hasFilteredResults ? (
          <div className="flex h-full min-h-70 flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-background/60 px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No matching issues
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Try a different keyword or relax the active filters to see more
              validation results.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SeveritySummaryCard
                label="Errors"
                count={
                  filteredWarnings.filter((item) => item.severity === "error")
                    .length
                }
                tone="error"
                icon={<AlertCircle className="h-4 w-4" />}
              />
              <SeveritySummaryCard
                label="Warnings"
                count={
                  filteredWarnings.filter((item) => item.severity === "warning")
                    .length
                }
                tone="warning"
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              <SeveritySummaryCard
                label="Info"
                count={
                  filteredWarnings.filter((item) => item.severity === "info")
                    .length
                }
                tone="info"
                icon={<Info className="h-4 w-4" />}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {filteredWarnings.length}
                </span>{" "}
                actionable issue(s).
              </p>
              <div className="flex flex-wrap items-center gap-2 text-readable-xs text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                  Sorted by severity
                </span>
                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                  Node-aware actions enabled
                </span>
              </div>
            </div>

            {groupedSections.map((section) => {
              return (
                <section key={section.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-2 ${section.toneClass}`}
                    >
                      <SeverityIcon
                        severity={section.severity}
                        className="h-4 w-4"
                      />
                      <h3 className="text-sm font-semibold">
                        {section.title} ({section.items.length})
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {section.items.map((warning) => (
                      <IssueCard
                        key={warning.id}
                        warning={warning}
                        onNodeNavigateAction={onNodeNavigateAction}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
