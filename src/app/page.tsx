"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Folder,
  Folders,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import { db, type Project } from "@/lib/db";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProjectTemplate = "quick" | "full";
type SortOption = "recent" | "oldest" | "name";
type FilterOption = "all" | "quick" | "full";

type TemplateConfig = {
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Zap;
  badge?: string;
  accentClass: string;
  cardClass: string;
  availability: "stable" | "experimental";
  helperText: string;
  nodes: { type: string; label: string; x: number; y: number }[];
  edges?: [number, number][];
};

type DeleteProjectState = {
  id: string;
  name: string;
} | null;

const TEMPLATES: Record<ProjectTemplate, TemplateConfig> = {
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
    nodes: [
      { type: "project_brief", label: "Project Brief", x: 0, y: 0 },
      { type: "requirements", label: "Requirements", x: 350, y: 0 },
      { type: "erd", label: "ERD", x: 700, y: 0 },
      { type: "task_board", label: "Task Board", x: 1050, y: 0 },
      { type: "summary", label: "Summary", x: 1400, y: 0 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 4],
    ],
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
    nodes: [
      { type: "project_brief", label: "Project Brief", x: 0, y: 0 },
      { type: "requirements", label: "Requirements", x: 300, y: 0 },
      { type: "user_stories", label: "User Stories", x: 600, y: 0 },
      { type: "use_cases", label: "Use Case", x: 0, y: 150 },
      { type: "flowchart", label: "Flowchart", x: 300, y: 150 },
      { type: "dfd", label: "DFD", x: 0, y: 300 },
      { type: "erd", label: "ERD", x: 300, y: 300 },
      { type: "sequence", label: "Sequence", x: 600, y: 300 },
      { type: "task_board", label: "Task Board", x: 0, y: 450 },
      { type: "summary", label: "Summary", x: 300, y: 450 },
    ],
  },
};

function formatDateTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getProgressMeta(doneCount: number, totalCount: number) {
  const safeTotal = Math.max(totalCount, 1);
  const percent = Math.round((doneCount / safeTotal) * 100);

  if (percent >= 100) {
    return {
      percent,
      label: "Completed",
      toneClass: "metric-pill metric-pill--success",
    };
  }

  if (percent >= 40) {
    return {
      percent,
      label: "In progress",
      toneClass: "metric-pill metric-pill--info",
    };
  }

  return {
    percent,
    label: totalCount === 0 ? "Not started" : "Early stage",
    toneClass: "metric-pill metric-pill--warning",
  };
}

function getProjectTemplate(project: Project): ProjectTemplate {
  return project.template_type ?? "quick";
}

export default function Dashboard() {
  const router = useRouter();
  const liveProjects = useLiveQuery(() => db.projects.toArray());
  const liveAllNodes = useLiveQuery(() => db.nodes.toArray());

  const projects = useMemo(() => liveProjects ?? [], [liveProjects]);
  const allNodes = useMemo(() => liveAllNodes ?? [], [liveAllNodes]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplate>("quick");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  const [deleteProject, setDeleteProject] = useState<DeleteProjectState>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const recentProject = useMemo(() => {
    if (projects.length === 0) return null;

    return [...projects].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];
  }, [projects]);

  const projectCards = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const mapped = projects.map((project) => {
      const projectNodes = allNodes.filter(
        (node) => node.project_id === project.id,
      );
      const doneCount = projectNodes.filter(
        (node) => node.status === "Done",
      ).length;
      const totalCount = projectNodes.length;
      const templateType = getProjectTemplate(project);
      const templateLabel =
        templateType === "quick" ? "Quick Start" : "Full Architecture";
      const progress = getProgressMeta(doneCount, totalCount);

      return {
        project,
        projectNodes,
        doneCount,
        totalCount,
        templateType,
        templateLabel,
        progress,
      };
    });

    const filtered = mapped.filter((item) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        item.project.name.toLowerCase().includes(normalizedQuery) ||
        item.project.description.toLowerCase().includes(normalizedQuery);

      const matchesFilter =
        filterBy === "all" ? true : item.templateType === filterBy;

      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.project.name.localeCompare(b.project.name);
      }

      if (sortBy === "oldest") {
        return (
          new Date(a.project.updated_at).getTime() -
          new Date(b.project.updated_at).getTime()
        );
      }

      return (
        new Date(b.project.updated_at).getTime() -
        new Date(a.project.updated_at).getTime()
      );
    });

    return filtered;
  }, [allNodes, filterBy, projects, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalNodes = allNodes.length;
    const completedNodes = allNodes.filter(
      (node) => node.status === "Done",
    ).length;
    const quickProjects = projects.filter(
      (project) => getProjectTemplate(project) === "quick",
    ).length;

    return {
      totalProjects,
      totalNodes,
      completedNodes,
      quickProjects,
    };
  }, [allNodes, projects]);

  const activeTemplate = TEMPLATES[selectedTemplate];
  const ActiveTemplateIcon = activeTemplate.icon;

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const template = TEMPLATES[selectedTemplate];
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.projects.add({
      id: newId,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      template_type: selectedTemplate,
      created_at: now,
      updated_at: now,
    });

    const defaultNodes = template.nodes.map((node) => ({
      id: crypto.randomUUID(),
      type: node.type,
      label: node.label,
      x: node.x,
      y: node.y,
    }));

    await db.nodes.bulkAdd(
      defaultNodes.map((node, index) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        project_id: newId,
        status: "Empty" as const,
        position_x: node.x,
        position_y: node.y,
        sort_order: index,
        updated_at: now,
      })),
    );

    const edgesToInsert =
      template.edges && template.edges.length > 0
        ? template.edges.map(([sourceIndex, targetIndex]) => ({
            id: crypto.randomUUID(),
            project_id: newId,
            source_node_id: defaultNodes[sourceIndex].id,
            target_node_id: defaultNodes[targetIndex].id,
          }))
        : defaultNodes.slice(0, -1).map((node, index) => ({
            id: crypto.randomUUID(),
            project_id: newId,
            source_node_id: node.id,
            target_node_id: defaultNodes[index + 1].id,
          }));

    await db.edges.bulkAdd(edgesToInsert);

    setIsCreateOpen(false);
    setNewProjectName("");
    setNewProjectDesc("");
    setSelectedTemplate("quick");

    router.push(`/workspace/${newId}`);
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
      const projectId = deleteProject.id;

      await db.projects.delete(projectId);
      const nodes = await db.nodes.where({ project_id: projectId }).toArray();
      const nodeIds = nodes.map((node) => node.id);

      await db.nodes.bulkDelete(nodeIds);
      await db.edges.where({ project_id: projectId }).delete();

      if (nodeIds.length > 0) {
        await db.nodeContents.where("node_id").anyOf(nodeIds).delete();
      }

      await db.tasks.where({ project_id: projectId }).delete();

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

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
                      Projects
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {stats.totalProjects}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
                      Nodes
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {stats.totalNodes}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
                      Completed
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {stats.completedNodes}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
                      Quick setups
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {stats.quickProjects}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <ModeToggle />
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger
                  render={
                    <Button size="lg" className="rounded-full px-5 shadow-sm">
                      <Plus className="mr-2 h-4 w-4" />
                      New Project
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-180">
                  <DialogHeader>
                    <DialogTitle>Create new project</DialogTitle>
                    <DialogDescription>
                      Start with the template that best matches your delivery
                      style. Guided mode remains your primary source of truth.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-5 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="project-name">Project name</Label>
                      <Input
                        id="project-name"
                        placeholder="e.g. Toko Online, Portfolio, Internal HRIS"
                        value={newProjectName}
                        onChange={(event) =>
                          setNewProjectName(event.target.value)
                        }
                        autoFocus
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="project-description">
                        Description{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="project-description"
                        placeholder="Short context about the project"
                        value={newProjectDesc}
                        onChange={(event) =>
                          setNewProjectDesc(event.target.value)
                        }
                      />
                    </div>

                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label>Choose a project template</Label>
                        <p className="text-sm leading-6 text-muted-foreground">
                          This selection is saved with the project so its
                          identity stays consistent even after you add or remove
                          nodes later.
                        </p>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="grid gap-3">
                          {(
                            Object.entries(TEMPLATES) as [
                              ProjectTemplate,
                              TemplateConfig,
                            ][]
                          ).map(([key, template]) => {
                            const Icon = template.icon;
                            const isSelected = selectedTemplate === key;

                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedTemplate(key)}
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
                                            <span
                                              className={template.accentClass}
                                            >
                                              {template.badge}
                                            </span>
                                          ) : (
                                            <span
                                              className={template.accentClass}
                                            >
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
                            <h3 className="font-semibold">
                              {activeTemplate.label}
                            </h3>
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
                                Great for deeper architecture work. Some editor
                                flows may still evolve, but you can already use
                                it productively.
                              </p>
                            </div>
                          )}

                          <div className="mt-4 space-y-2">
                            <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
                              Included nodes
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {activeTemplate.nodes.map((node, index) => (
                                <Badge
                                  key={`${node.type}-${index}`}
                                  variant="secondary"
                                  className="rounded-full px-2.5 py-1 text-readable-xs"
                                >
                                  {node.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim()}
                    >
                      Create workspace
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects by name or description..."
              className="h-11 rounded-2xl pl-10 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="rounded-full">
                    Filter
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Project type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={filterBy}
                  onValueChange={(value) => setFilterBy(value as FilterOption)}
                >
                  <DropdownMenuRadioItem value="all">
                    All projects
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="quick">
                    Quick Start
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="full">
                    Full Architecture
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="rounded-full">
                    Sort
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortOption)}
                >
                  <DropdownMenuRadioItem value="recent">
                    Recently updated
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">
                    Oldest updated
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">
                    Name A–Z
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

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
          {projectCards.length === 0 ? (
            <div className="workspace-panel flex min-h-90 flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/80 px-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                {projects.length === 0 ? (
                  <Folders className="h-8 w-8" />
                ) : (
                  <Search className="h-8 w-8" />
                )}
              </div>

              <h2 className="text-xl font-semibold">
                {projects.length === 0
                  ? "No projects yet"
                  : "No matching projects"}
              </h2>

              <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                {projects.length === 0
                  ? "Create your first project to start turning briefs, requirements, and diagrams into an execution-ready workspace."
                  : "Try a different search or filter, or create a fresh workspace for a new initiative."}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {projects.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterBy("all");
                    }}
                  >
                    Reset filters
                  </Button>
                )}
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projectCards.map(
                ({
                  project,
                  doneCount,
                  totalCount,
                  templateLabel,
                  templateType,
                  progress,
                }) => (
                  <Card
                    key={project.id}
                    className="group cursor-pointer rounded-[1.6rem] border border-border/70 bg-card/90 py-0 transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_28px_80px_-44px_rgba(15,23,42,0.5)]"
                    onClick={() => router.push(`/workspace/${project.id}`)}
                  >
                    <CardHeader className="gap-3 border-b border-border/70 px-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                templateType === "quick"
                                  ? "default"
                                  : "secondary"
                              }
                              className="rounded-full px-2.5 py-1 text-readable-xs"
                            >
                              {templateLabel}
                            </Badge>
                            <span className={progress.toneClass}>
                              {progress.label}
                            </span>
                          </div>

                          <div>
                            <CardTitle className="text-xl font-semibold leading-tight">
                              {project.name}
                            </CardTitle>
                            <CardDescription className="mt-2 line-clamp-2 text-sm leading-7">
                              {project.description ||
                                "No description provided yet."}
                            </CardDescription>
                          </div>
                        </div>

                        <CardAction className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full text-muted-foreground hover:text-destructive"
                            onClick={(event) =>
                              requestDeleteProject(
                                project.id,
                                project.name,
                                event,
                              )
                            }
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
                            <p className="text-2xl font-bold">
                              {progress.percent}%
                            </p>
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
                ),
              )}
            </div>
          )}
        </main>
      </div>

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
