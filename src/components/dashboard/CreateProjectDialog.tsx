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
import { CONTENT_TEMPLATES, type ContentTemplateKey } from "@/lib/contentTemplates";

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
  selectedContentTemplate: ContentTemplateKey;
  onContentTemplateChange: (key: ContentTemplateKey) => void;
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
  selectedContentTemplate,
  onContentTemplateChange,
  onCreate,
}: CreateProjectDialogProps) {
  const activeTemplate = TEMPLATES[selectedTemplate];
  const ActiveTemplateIcon = activeTemplate.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden p-0 sm:max-w-2xl lg:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription>
            Start with the template that best matches your delivery style. Guided
            mode remains your primary source of truth.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6">
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

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={[
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground",
                                ].join(" ")}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
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
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  {template.helperText}
                                </p>
                              </div>
                            </div>

                            <p className="text-sm leading-relaxed text-muted-foreground sm:pl-13">
                              {template.description}
                            </p>
                          </div>

                          {isSelected && (
                            <Badge className="w-fit rounded-full px-3 py-1 text-readable-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                  <div className="flex items-center gap-2 font-medium">
                    <ActiveTemplateIcon className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{activeTemplate.label}</h3>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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

                  <div className="mt-5 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Included nodes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PROJECT_TEMPLATES[selectedTemplate].nodes.map(
                        (node, index) => (
                          <Badge
                            key={`${node.type}-${index}`}
                            variant="secondary"
                            className="rounded-full bg-background border border-border/60 px-2.5 py-1 text-readable-xs font-medium"
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

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Pre-fill Project Brief</Label>
                <p className="text-sm leading-6 text-muted-foreground">
                  Jump-start your brief with a starter template. You can edit everything after.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-6">
                {CONTENT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => onContentTemplateChange(tpl.key)}
                    className={[
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                      selectedContentTemplate === tpl.key
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5",
                    ].join(" ")}
                  >
                    <span className="text-xl">{tpl.emoji}</span>
                    <span className="text-[10px] font-bold leading-tight text-foreground">
                      {tpl.label}
                    </span>
                  </button>
                ))}
              </div>
              {selectedContentTemplate !== "blank" && (
                <p className="text-readable-xs text-muted-foreground">
                  {CONTENT_TEMPLATES.find((t) => t.key === selectedContentTemplate)?.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
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
