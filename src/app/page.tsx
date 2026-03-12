"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Plus,
} from "lucide-react";

import { createProject, deleteProject as deleteProjectAction } from "@/lib/projectEngine";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { ProjectFilters } from "@/components/dashboard/ProjectFilters";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { CreateProjectDialog, TemplateKey } from "@/components/dashboard/CreateProjectDialog";
import { useDashboardData, formatDateTime } from "@/components/dashboard/useDashboardData";

type DeleteProjectState = {
  id: string;
  name: string;
} | null;

export default function Dashboard() {
  const router = useRouter();
  const {
    projects,
    recentProject,
    projectCards,
    stats,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
  } = useDashboardData();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("quick");

  const [deleteProject, setDeleteProject] = useState<DeleteProjectState>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const projectId = await createProject({
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      templateKey: selectedTemplate,
    });

    setIsCreateOpen(false);
    setNewProjectName("");
    setNewProjectDesc("");
    setSelectedTemplate("quick");

    router.push(`/workspace/${projectId}`);
  };

  const requestDeleteProject = (
    id: string,
    name: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    setDeleteProject({ id, name });
  };

  const confirmDeleteProject = async () => {
    if (!deleteProject) return;

    setIsDeletingProject(true);
    try {
      await deleteProjectAction(deleteProject.id);
      setDeleteProject(null);
    } finally {
      setIsDeletingProject(false);
    }
  };

  return (
    <div className="workspace-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="workspace-header mb-5 rounded-[1.75rem] border border-border/70 px-5 py-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-readable-xs"
                >
                  Local-first workspace
                </Badge>
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-readable-xs"
                >
                  Offline-ready
                </Badge>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  ARCHWAY
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  The bridge between thinking and building. Capture
                  architecture, map decisions, and turn your documentation into
                  execution-ready tasks.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4">
                  <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
                    Continue where you left off
                  </p>

                  {recentProject ? (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">
                          {recentProject.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Updated {formatDateTime(recentProject.updated_at)}
                        </p>
                      </div>

                      <Button
                        className="rounded-full"
                        onClick={() =>
                          router.push(`/workspace/${recentProject.id}`)
                        }
                      >
                        Continue workspace
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        No recent workspace yet. Start a new project to begin
                        documenting your flow.
                      </p>
                      <Button
                        className="rounded-full"
                        onClick={() => setIsCreateOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New Project
                      </Button>
                    </div>
                  )}
                </div>

                <StatsOverview
                  totalProjects={stats.totalProjects}
                  totalNodes={stats.totalNodes}
                  completedNodes={stats.completedNodes}
                  quickProjects={stats.quickProjects}
                />
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <ModeToggle />
              <Button
                size="lg"
                className="rounded-full px-5 shadow-sm"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>
        </header>

        <ProjectFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
        />

        <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 text-readable-xs"
            >
              {projectCards.length} visible
            </Badge>
            {filterBy !== "all" && (
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-readable-xs"
              >
                Filter:{" "}
                {filterBy === "quick" ? "Quick Start" : "Full Architecture"}
              </Badge>
            )}
            {searchQuery.trim() && (
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-readable-xs"
              >
                Search: “{searchQuery.trim()}”
              </Badge>
            )}
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            Resume where you left off or start a new architecture workspace.
          </p>
        </section>

        <main className="flex-1">
          <ProjectGrid
            projectCards={projectCards}
            onProjectClick={(id) => router.push(`/workspace/${id}`)}
            onDeleteRequest={requestDeleteProject}
            onResetFilters={() => {
              setSearchQuery("");
              setFilterBy("all");
            }}
            onCreateProject={() => setIsCreateOpen(true)}
            totalProjects={projects.length}
          />
        </main>
      </div>

      <CreateProjectDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projectName={newProjectName}
        onProjectNameChange={setNewProjectName}
        projectDesc={newProjectDesc}
        onProjectDescChange={setNewProjectDesc}
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
        onCreate={handleCreateProject}
      />

      <ConfirmDialog
        open={Boolean(deleteProject)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteProject(null);
          }
        }}
        title="Delete project"
        description={
          deleteProject
            ? `Delete “${deleteProject.name}”? All associated nodes, tasks, and generated content will be removed from this device.`
            : ""
        }
        confirmLabel="Delete project"
        cancelLabel="Cancel"
        variant="destructive"
        loading={isDeletingProject}
        onConfirm={confirmDeleteProject}
      />
    </div>
  );
}
