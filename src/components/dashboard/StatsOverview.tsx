"use client";

import React from "react";

interface StatsOverviewProps {
  totalProjects: number;
  totalNodes: number;
  completedNodes: number;
  quickProjects: number;
}

export function StatsOverview({
  totalProjects,
  totalNodes,
  completedNodes,
  quickProjects,
}: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
        <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
          Projects
        </p>
        <p className="mt-2 text-2xl font-bold">{totalProjects}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
        <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
          Nodes
        </p>
        <p className="mt-2 text-2xl font-bold">{totalNodes}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
        <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
          Completed
        </p>
        <p className="mt-2 text-2xl font-bold">{completedNodes}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
        <p className="text-readable-2xs uppercase tracking-[0.18em] text-muted-foreground">
          Quick setups
        </p>
        <p className="mt-2 text-2xl font-bold">{quickProjects}</p>
      </div>
    </div>
  );
}
