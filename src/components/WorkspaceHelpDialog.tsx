"use client";

import {
  CheckCircle2,
  Circle,
  Hand,
  Keyboard,
  Move,
  Search,
  Sparkles,
  ZoomIn,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type HelpChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

type WorkspaceHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist: HelpChecklistItem[];
};

const WORKSPACE_TIPS = [
  {
    icon: Sparkles,
    title: "Start with the recommended node",
    description:
      "Look for badges like “Start here” or use the next unfinished node button to continue the documentation flow without guessing the next step.",
  },
  {
    icon: Hand,
    title: "Click a node to open the editor panel",
    description:
      "The right-side panel is your main workspace for entering data. The Guided tab is the primary source of truth because diagrams, tasks, validation, and exports are built from it.",
  },
  {
    icon: Move,
    title: "Navigate the canvas quickly",
    description:
      "Hold Space and drag to pan, drag nodes to reorganize the flow, and use the minimap to move across large workspaces faster.",
  },
  {
    icon: ZoomIn,
    title: "Use zoom controls when needed",
    description:
      "Pinch to zoom, then use fit view whenever you lose context. This is especially helpful once the workspace grows and nodes spread out.",
  },
  {
    icon: Search,
    title: "Review validation regularly",
    description:
      "Open the validation panel to review cross-node errors, warnings, and informational issues before exporting or moving into implementation.",
  },
  {
    icon: Keyboard,
    title: "Build a consistent working rhythm",
    description:
      "The safest workflow is brief → requirements → diagrams → tasks → summary so your documentation stays connected and execution-ready.",
  },
] as const;

function ChecklistProgress({ checklist }: { checklist: HelpChecklistItem[] }) {
  const completed = checklist.filter((item) => item.done).length;
  const total = checklist.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-readable-xs uppercase tracking-[0.16em] text-muted-foreground">
            Progress checklist
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {completed}/{total} steps completed
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Use this checklist to make sure your workspace keeps moving from
            context to execution.
          </p>
        </div>

        <Badge variant="secondary" className="rounded-full px-3 py-1">
          {percent}% complete
        </Badge>
      </div>

      <div className="progress-track mt-4">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 space-y-2">
        {checklist.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-3"
          >
            <div className="mt-0.5 shrink-0">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p
              className={
                item.done
                  ? "text-sm font-medium text-foreground"
                  : "text-sm text-muted-foreground"
              }
            >
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkspaceHelpDialog({
  open,
  onOpenChange,
  checklist,
}: WorkspaceHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="rounded-full px-3 py-1 text-readable-xs">
              Workspace Guide
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Reusable help
            </Badge>
          </div>

          <DialogTitle className="text-xl">
            Tips and checklist for completing your workspace
          </DialogTitle>
          <DialogDescription className="max-w-2xl">
            Use this guide when you first enter the workspace, when you return
            to an older project, or whenever you want to keep your documentation
            clear, consistent, and ready for execution.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-readable-xs uppercase tracking-[0.16em] text-muted-foreground">
                Recommended flow
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Project Brief",
                  "Requirements",
                  "Diagram / Model",
                  "Task Board",
                  "Summary",
                ].map((step) => (
                  <Badge
                    key={step}
                    variant="outline"
                    className="rounded-full px-3 py-1"
                  >
                    {step}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {WORKSPACE_TIPS.map((tip) => {
                const Icon = tip.icon;

                return (
                  <div
                    key={tip.title}
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {tip.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ChecklistProgress checklist={checklist} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onOpenChange(false)}>Continue working</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
