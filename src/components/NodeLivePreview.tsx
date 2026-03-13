"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { RequirementItem, ERDEntity, ERDRelationship, FlowchartFlow, SequenceParticipant, SequenceMessage, DFDNode } from "@/components/editors/summary/types";

type PreviewProps = {
  nodeId: string;
  nodeType: string;
  projectId: string;
};

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-black/40 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] font-semibold text-black/50">{pct}%</span>
    </div>
  );
}

function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-black/55">
      {children}
    </div>
  );
}

function Dot() {
  return <span className="text-black/25">·</span>;
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold text-black/60">
      {label}
    </span>
  );
}

export function NodeLivePreview({ nodeId, nodeType, projectId }: PreviewProps) {
  const content = useLiveQuery(
    () => db.nodeContents.where({ node_id: nodeId }).first(),
    [nodeId],
  );

  const tasks = useLiveQuery(
    async () => {
      if (nodeType !== "task_board") return undefined;
      return db.tasks.where({ project_id: projectId }).toArray();
    },
    [nodeType, projectId],
  );

  // Not yet loaded
  if (content === undefined && nodeType !== "task_board") {
    return <div className="h-8" />;
  }

  const fields = content?.structured_fields ?? {};

  switch (nodeType) {
    case "project_brief": {
      const objectives = (fields.objectives as string[]) ?? [];
      const scopeIn = (fields.scope_in as string[]) ?? [];
      if (objectives.length === 0 && scopeIn.length === 0) return <EmptyHint />;
      return (
        <StatRow>
          <span>{objectives.length} objective{objectives.length !== 1 ? "s" : ""}</span>
          <Dot />
          <span>{scopeIn.length} scope item{scopeIn.length !== 1 ? "s" : ""}</span>
        </StatRow>
      );
    }

    case "requirements": {
      const items = (fields.items as RequirementItem[]) ?? [];
      if (items.length === 0) return <EmptyHint />;
      const fr = items.filter((i) => (i.type ?? "FR") === "FR").length;
      const nfr = items.filter((i) => i.type === "NFR").length;
      const mustUnaddressed = items.filter(
        (i) => (i.priority === "Must" || i.priority === "must") && (i.type ?? "FR") === "FR",
      ).length;
      return (
        <div className="space-y-1">
          <StatRow>
            <span>{fr} FR</span>
            <Dot />
            <span>{nfr} NFR</span>
            {mustUnaddressed > 0 && (
              <>
                <Dot />
                <span className="font-semibold text-amber-700/80">⚠ {mustUnaddressed} Must</span>
              </>
            )}
          </StatRow>
        </div>
      );
    }

    case "erd": {
      const entities = (fields.entities as ERDEntity[]) ?? [];
      const relationships = (fields.relationships as ERDRelationship[]) ?? [];
      if (entities.length === 0) {
        const mermaidLines = (content?.mermaid_manual ?? content?.mermaid_auto ?? "")
          .split("\n")
          .filter((l) => l.trim()).length;
        if (mermaidLines > 1) return <StatRow><span>Mermaid diagram · {mermaidLines} lines</span></StatRow>;
        return <EmptyHint />;
      }
      const names = entities.slice(0, 3).map((e) => e.name ?? "?");
      const overflow = entities.length - 3;
      return (
        <div className="space-y-1.5">
          <StatRow>
            <span>{entities.length} entit{entities.length !== 1 ? "ies" : "y"}</span>
            <Dot />
            <span>{relationships.length} relation{relationships.length !== 1 ? "s" : ""}</span>
          </StatRow>
          <div className="flex flex-wrap gap-1">
            {names.map((n) => <Pill key={n} label={n} />)}
            {overflow > 0 && <Pill label={`+${overflow}`} />}
          </div>
        </div>
      );
    }

    case "flowchart": {
      const flows = (fields.flows as FlowchartFlow[]) ?? [];
      if (flows.length > 0) {
        const names = flows.slice(0, 2).map((f) => f.name ?? "Flow");
        return (
          <StatRow>
            <span>{flows.length} flow{flows.length !== 1 ? "s" : ""}</span>
            <Dot />
            {names.map((n, i) => <span key={i}>{n}</span>)}
            {flows.length > 2 && <span>+{flows.length - 2}</span>}
          </StatRow>
        );
      }
      const mermaidLines = (content?.mermaid_manual ?? "").split("\n").filter((l) => l.trim()).length;
      if (mermaidLines > 1) return <StatRow><span>Mermaid · {mermaidLines} lines</span></StatRow>;
      return <EmptyHint />;
    }

    case "sequence": {
      const participants = (fields.participants as SequenceParticipant[]) ?? [];
      const messages = (fields.messages as SequenceMessage[]) ?? [];
      if (participants.length > 0 || messages.length > 0) {
        return (
          <StatRow>
            <span>{participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
            <Dot />
            <span>{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
          </StatRow>
        );
      }
      const mermaidLines = (content?.mermaid_manual ?? "").split("\n").filter((l) => l.trim()).length;
      if (mermaidLines > 1) return <StatRow><span>Mermaid · {mermaidLines} lines</span></StatRow>;
      return <EmptyHint />;
    }

    case "dfd": {
      const nodes = (fields.nodes as DFDNode[]) ?? [];
      const processes = nodes.filter((n) => n.type === "process").length;
      const datastores = nodes.filter((n) => n.type === "datastore").length;
      if (nodes.length > 0) {
        return (
          <StatRow>
            <span>{processes} process{processes !== 1 ? "es" : ""}</span>
            <Dot />
            <span>{datastores} data store{datastores !== 1 ? "s" : ""}</span>
          </StatRow>
        );
      }
      const mermaidLines = (content?.mermaid_manual ?? "").split("\n").filter((l) => l.trim()).length;
      if (mermaidLines > 1) return <StatRow><span>Mermaid · {mermaidLines} lines</span></StatRow>;
      return <EmptyHint />;
    }

    case "user_stories": {
      const items = (fields.items as unknown[]) ?? [];
      if (items.length === 0) return <EmptyHint />;
      return <StatRow><span>{items.length} user stor{items.length !== 1 ? "ies" : "y"}</span></StatRow>;
    }

    case "use_cases": {
      const useCases = (fields.useCases as unknown[]) ?? [];
      if (useCases.length === 0) return <EmptyHint />;
      return <StatRow><span>{useCases.length} use case{useCases.length !== 1 ? "s" : ""}</span></StatRow>;
    }

    case "task_board": {
      if (!tasks) return <div className="h-8" />;
      const todo = tasks.filter((t) => t.status === "todo").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const done = tasks.filter((t) => t.status === "done").length;
      const total = tasks.length;
      if (total === 0) return <EmptyHint />;
      return (
        <div className="space-y-1.5">
          <StatRow>
            <span>{todo} todo</span>
            <Dot />
            <span>{inProgress} in progress</span>
            <Dot />
            <span>{done} done</span>
          </StatRow>
          <ProgressBar value={done} total={total} />
        </div>
      );
    }

    case "summary": {
      return <StatRow><span>Delivery review</span></StatRow>;
    }

    default:
      return null;
  }
}

function EmptyHint() {
  return (
    <p className="text-[11px] italic text-black/30">No content yet</p>
  );
}
