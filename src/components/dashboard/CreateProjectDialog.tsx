"use client";

import React from "react";
import { Zap, BookOpen, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PROJECT_TEMPLATES } from "@/lib/projectEngine";

export type TemplateKey = "quick" | "full";

export type TemplateConfig = {
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  badge?: string;
  accentClass: string;
  cardClass: string;
  availability: "stable" | "experimental";
  helperText: string;
};

export const TEMPLATES: Record<TemplateKey, TemplateConfig> = {
  quick: {
    label: "Quick Start",
    shortLabel: "Quick",
    description:
      "Brief → Requirements → ERD → Task Board → Summary. Ideal for solo projects, prototypes, and client work.",
    icon: Zap,
    accentClass: "metric-pill metric-pill--success",
    cardClass:
      "border-border/70 bg-background hover:border-primary/35 hover:bg-primary/5",
    availability: "stable",
    helperText:
      "Best default. Fast path from idea to documentation and execution plan.",
  },
  full: {
    label: "Full Architecture",
    shortLabel: "Full",
    description:
      "Complete architecture workflow with user stories, use cases, DFD, flowcharts, sequence diagrams, tasks, and summary.",
    icon: BookOpen,
    badge: "Experimental",
    accentClass: "metric-pill metric-pill--warning",
    cardClass:
      "border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10",
    availability: "experimental",
    helperText:
      "For deeper documentation. Available now, but some editor flows may still evolve.",
  },
};

interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  projectDesc: string;
  onProjectDescChange: (value: string) => void;
  selectedTemplate: TemplateKey;
  onTemplateChange: (key: TemplateKey) => void;
  onCreate: () => void;
}

export function CreateProjectDialog({
  isOpen,
  onOpenChange,
  projectName,
  onProjectNameChange,
  projectDesc,
  onProjectDescChange,
  selectedTemplate,
  onTemplateChange,
  onCreate,
}: CreateProjectDialogProps) {
  const activeTemplate = TEMPLATES[selectedTemplate];
  const ActiveTemplateIcon = activeTemplate.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-180">
        <DialogHeader>
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription>
            Start with the template that best matches your delivery style. Guided
            mode remains your primary source of truth.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              placeholder="e.g. Toko Online, Portfolio, Internal HRIS"
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="project-description"
              placeholder="Short context about the project"
              value={projectDesc}
              onChange={(event) => onProjectDescChange(event.target.value)}
            />
          </div>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Choose a project template</Label>
              <p className="text-sm leading-6 text-muted-foreground">
                This selection is saved with the project so its identity stays
                consistent even after you add or remove nodes later.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-3">
                {(
                  Object.entries(TEMPLATES) as [TemplateKey, TemplateConfig][]
                ).map(([key, template]) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onTemplateChange(key)}
                      className={[
                        "rounded-2xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : template.cardClass,
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={[
                                "flex h-10 w-10 items-center justify-center rounded-xl",
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground",
                              ].join(" ")}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {template.label}
                                </span>
                                {template.badge ? (
                                  <span className={template.accentClass}>
                                    {template.badge}
                                  </span>
                                ) : (
                                  <span className={template.accentClass}>
                                    Stable
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {template.helperText}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm leading-6 text-muted-foreground">
                            {template.description}
                          </p>
                        </div>

                        {isSelected && (
                          <Badge className="rounded-full px-3 py-1 text-readable-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <ActiveTemplateIcon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{activeTemplate.label}</h3>
                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeTemplate.description}
                </p>

                {activeTemplate.availability === "experimental" && (
                  <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      Experimental template
                    </p>
                    <p className="mt-1 text-readable-xs leading-5 text-amber-700/90 dark:text-amber-300">
                      Great for deeper architecture work. Some editor flows may
                      still evolve, but you can already use it productively.
                    </p>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
                    Included nodes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PROJECT_TEMPLATES[selectedTemplate].nodes.map(
                      (node, index) => (
                        <Badge
                          key={`${node.type}-${index}`}
                          variant="secondary"
                          className="rounded-full px-2.5 py-1 text-readable-xs"
                        >
                          {node.label}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!projectName.trim()}>
            Create workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
