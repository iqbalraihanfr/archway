"use client";

import React from "react";
import { Folders, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "./ProjectCard";
import { formatDateTime } from "./useDashboardData";

interface ProjectGridProps {
  projectCards: any[];
  onProjectClick: (id: string) => void;
  onDeleteRequest: (id: string, name: string, event: React.MouseEvent) => void;
  onResetFilters: () => void;
  onCreateProject: () => void;
  totalProjects: number;
}

export function ProjectGrid({
  projectCards,
  onProjectClick,
  onDeleteRequest,
  onResetFilters,
  onCreateProject,
  totalProjects,
}: ProjectGridProps) {
  if (projectCards.length === 0) {
    return (
      <div className="workspace-panel flex min-h-90 flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/80 px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          {totalProjects === 0 ? (
            <Folders className="h-8 w-8" />
          ) : (
            <Search className="h-8 w-8" />
          )}
        </div>

        <h2 className="text-xl font-semibold">
          {totalProjects === 0 ? "No projects yet" : "No matching projects"}
        </h2>

        <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
          {totalProjects === 0
            ? "Create your first project to start turning briefs, requirements, and diagrams into an execution-ready workspace."
            : "Try a different search or filter, or create a fresh workspace for a new initiative."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {totalProjects > 0 && (
            <Button variant="outline" onClick={onResetFilters}>
              Reset filters
            </Button>
          )}
          <Button onClick={onCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {projectCards.map((item) => (
        <ProjectCard
          key={item.project.id}
          project={item.project}
          doneCount={item.doneCount}
          totalCount={item.totalCount}
          templateLabel={item.templateLabel}
          templateType={item.templateType}
          progress={item.progress}
          onClick={() => onProjectClick(item.project.id)}
          onDelete={(event) =>
            onDeleteRequest(item.project.id, item.project.name, event)
          }
          formatDateTime={formatDateTime}
        />
      ))}
    </div>
  );
}
