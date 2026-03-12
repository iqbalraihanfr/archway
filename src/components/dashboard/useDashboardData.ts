"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Project } from "@/lib/db";
import { FilterOption, SortOption } from "./ProjectFilters";

export type TemplateKey = "quick" | "full";

export function getProgressMeta(doneCount: number, totalCount: number) {
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

export function formatDateTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function getProjectTemplate(project: Project): TemplateKey {
  return (project.template_type as TemplateKey) ?? "quick";
}

export function useDashboardData() {
  const liveProjects = useLiveQuery(() => db.projects.toArray());
  const liveAllNodes = useLiveQuery(() => db.nodes.toArray());

  const projects = useMemo(() => liveProjects ?? [], [liveProjects]);
  const allNodes = useMemo(() => liveAllNodes ?? [], [liveAllNodes]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

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

  return {
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
  };
}
