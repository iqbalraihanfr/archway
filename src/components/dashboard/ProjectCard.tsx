"use client";

import React from "react";
import {
  Trash2,
  Sparkles,
  Folder,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Project } from "@/lib/db";

interface ProjectCardProps {
  project: Project;
  doneCount: number;
  totalCount: number;
  templateLabel: string;
  templateType: string;
  progress: {
    percent: number;
    label: string;
    toneClass: string;
  };
  onClick: () => void;
  onDelete: (event: React.MouseEvent) => void;
  formatDateTime: (value: string) => string;
}

export function ProjectCard({
  project,
  doneCount,
  totalCount,
  templateLabel,
  templateType,
  progress,
  onClick,
  onDelete,
  formatDateTime,
}: ProjectCardProps) {
  return (
    <Card
      className="group cursor-pointer rounded-[1.6rem] border border-border/70 bg-card/90 py-0 transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_28px_80px_-44px_rgba(15,23,42,0.5)]"
      onClick={onClick}
    >
      <CardHeader className="gap-3 border-b border-border/70 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={templateType === "quick" ? "default" : "secondary"}
                className="rounded-full px-2.5 py-1 text-readable-xs"
              >
                {templateLabel}
              </Badge>
              <span className={progress.toneClass}>{progress.label}</span>
            </div>

            <div>
              <CardTitle className="text-xl font-semibold leading-tight">
                {project.name}
              </CardTitle>
              <CardDescription className="mt-2 line-clamp-2 text-sm leading-7">
                {project.description || "No description provided yet."}
              </CardDescription>
            </div>
          </div>

          <CardAction className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label={`Delete ${project.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 py-5">
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-readable-2xs uppercase tracking-[0.16em] text-muted-foreground">
                Progress
              </p>
              <p className="mt-1 text-base font-semibold">
                {doneCount}/{totalCount} nodes completed
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{progress.percent}%</p>
              <p className="text-readable-xs text-muted-foreground">
                completion
              </p>
            </div>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
            <p className="text-readable-2xs uppercase tracking-[0.16em] text-muted-foreground">
              Last updated
            </p>
            <p className="mt-2 text-sm font-medium">
              {formatDateTime(project.updated_at)}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
            <p className="text-readable-2xs uppercase tracking-[0.16em] text-muted-foreground">
              Suggested action
            </p>
            <p className="mt-2 text-sm font-medium">
              {progress.percent === 100
                ? "Review summary"
                : doneCount === 0
                  ? "Start documenting"
                  : "Continue workspace"}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-between rounded-b-[1.6rem] border-t border-border/70 bg-muted/25 px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {progress.percent === 100 ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
          <span>
            {progress.percent === 100
              ? "Ready for review"
              : "Resume documentation"}
          </span>
        </div>

        <Button variant="outline" className="rounded-full">
          Continue
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
