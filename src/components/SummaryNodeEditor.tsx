"use client";

import { useEffect, useMemo, useState } from "react";
import mermaid from "mermaid";
import Markdown from "react-markdown";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe,
  Info,
  Layers,
  ListTodo,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  db,
  type NodeContent,
  type NodeData,
  type TaskData,
  type ValidationWarning,
} from "@/lib/db";
import type { ProjectBriefFields } from "@/components/editors/ProjectBriefEditor";

type SummaryNodeEditorProps = {
  node: NodeData;
  onCloseAction: () => void;
};

type RequirementPriority = "Must" | "Should" | "Could" | "Wont";
type RequirementType = "FR" | "NFR";

type RequirementItem = {
  id?: string;
  type?: RequirementType;
  priority?: RequirementPriority | string;
  description?: string;
  related_scope?: string;
};

type UserStoryAcceptanceCriteria =
  | string
  | {
      given?: string;
      when?: string;
      then?: string;
    };

type UserStoryItem = {
  id?: string;
  role?: string;
  goal?: string;
  benefit?: string;
  related_requirement?: string;
  acceptance_criteria?: UserStoryAcceptanceCriteria[];
  priority?: string;
};

type UseCaseMainFlowStep = {
  actor?: string;
  action?: string;
};

type UseCaseAlternativeFlow = {
  name?: string;
  branch_from_step?: string;
  steps?: string;
};

type UseCaseIncludeExtend = {
  type?: "include" | "extend";
  target_uc?: string;
};

type UseCaseItem = {
  id?: string;
  name?: string;
  primary_actor?: string;
  secondary_actors?: string[];
  description?: string;
  preconditions?: string[];
  postconditions?: string[];
  main_flow?: UseCaseMainFlowStep[];
  alternative_flows?: UseCaseAlternativeFlow[];
  related_user_stories?: string[];
  related_stories?: string[];
  include_extend?: UseCaseIncludeExtend[];
};

type FlowchartStep = {
  id?: string;
  label?: string;
  type?: "start" | "process" | "decision" | "end";
  yes_target?: string;
  no_target?: string;
};

type FlowchartConnection = {
  id?: string;
  from?: string;
  to?: string;
  label?: string;
};

type FlowchartFlow = {
  id?: string;
  name?: string;
  related_use_case?: string;
  trigger?: string;
  steps?: FlowchartStep[];
  connections?: FlowchartConnection[];
};

type SequenceParticipant =
  | string
  | { name?: string; type?: string; order?: number };

type SequenceMessage = {
  id?: string;
  from?: string;
  to?: string;
  content?: string;
  type?: "request" | "response" | "self";
  group?: "none" | "alt" | "opt" | "loop";
  group_label?: string;
};

type ERDAttribute = {
  name?: string;
  type?: string;
  description?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  isRequired?: boolean;
  isIndex?: boolean;
};

type ERDEntity = {
  id?: string;
  name?: string;
  description?: string;
  attributes?: ERDAttribute[];
};

type ERDRelationship = {
  id?: string;
  from?: string;
  to?: string;
  type?: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  label?: string;
  junction_table?: string;
};

type DFDNode = {
  id?: string;
  label?: string;
  type?: "process" | "entity" | "datastore";
  related_use_case?: string;
  related_uc?: string;
  related_erd_entity?: string;
};

type DFDFlow = {
  id?: string;
  from?: string;
  to?: string;
  label?: string;
};

type SuccessMetric = {
  metric?: string;
  target?: string;
};

type ReferencePair = {
  name?: string;
  url?: string;
};

type SummaryStructuredFields = {
  notes?: string;
  sql?: string;
  items?: RequirementItem[] | UserStoryItem[];
  useCases?: UseCaseItem[];
  actors?: string[];
  entities?: ERDEntity[];
  relationships?: ERDRelationship[];
  flows?: FlowchartFlow[];
  steps?: FlowchartStep[];
  connections?: FlowchartConnection[];
  participants?: SequenceParticipant[];
  messages?: SequenceMessage[];
  nodes?: DFDNode[];
  scope_in?: string[];
  scope_out?: string[];
  target_users?: string[];
  objectives?: string[];
  constraints?: string[];
  tech_stack?: string[];
  success_metrics?: SuccessMetric[];
  references?: ReferencePair[];
  name?: string;
  background?: string;
} & Record<string, unknown>;

type SummaryContent = Omit<NodeContent, "structured_fields"> & {
  structured_fields: SummaryStructuredFields;
};

type CoverageMetric = {
  label: string;
  covered: number;
  total: number;
  description?: string;
};

type ProjectSnapshot = {
  allProjectNodes: NodeData[];
  displayNodes: NodeData[];
  contents: Record<string, SummaryContent>;
  tasks: TaskData[];
  warnings: ValidationWarning[];
};

const STATUS_BADGE_CLASS: Record<NodeData["status"], string> = {
  Done: "bg-green-500/10 text-green-600",
  "In Progress": "bg-blue-500/10 text-blue-600",
  Empty: "bg-muted text-muted-foreground",
};

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-500/10 text-green-700 dark:text-green-400",
  POST: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PUT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PATCH: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  DELETE: "bg-red-500/10 text-red-700 dark:text-red-400",
};

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "strict",
});

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function getStructuredFields(content?: NodeContent): SummaryStructuredFields {
  if (!content || !isObject(content.structured_fields)) {
    return {};
  }

  return content.structured_fields as SummaryStructuredFields;
}

function getNodeContentMap(
  nodes: NodeData[],
  contents: NodeContent[],
): Record<string, SummaryContent> {
  const byNodeId = new Map<string, SummaryContent>();

  nodes.forEach((projectNode) => {
    const content = contents.find((entry) => entry.node_id === projectNode.id);
    if (!content) return;

    byNodeId.set(projectNode.id, {
      ...content,
      structured_fields: getStructuredFields(content),
    });
  });

  return Object.fromEntries(byNodeId.entries());
}

function getNodeByType(nodes: NodeData[], type: string): NodeData | undefined {
  return nodes.find((entry) => entry.type === type);
}

function getFieldsByType(
  nodes: NodeData[],
  contentMap: Record<string, SummaryContent>,
  type: string,
): SummaryStructuredFields | null {
  const matchedNode = getNodeByType(nodes, type);
  if (!matchedNode) return null;
  return contentMap[matchedNode.id]?.structured_fields ?? null;
}

function getRequirementItems(
  fields: SummaryStructuredFields | null,
): RequirementItem[] {
  const raw = fields?.items;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is RequirementItem => isObject(item));
}

function getUserStoryItems(
  fields: SummaryStructuredFields | null,
): UserStoryItem[] {
  const raw = fields?.items;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is UserStoryItem => isObject(item));
}

function getUseCaseItems(
  fields: SummaryStructuredFields | null,
): UseCaseItem[] {
  const raw = fields?.useCases;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is UseCaseItem => isObject(item));
}

function getFlowchartFlows(
  fields: SummaryStructuredFields | null,
): FlowchartFlow[] {
  const raw = fields?.flows;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is FlowchartFlow => isObject(item));
}

function getERDEntities(fields: SummaryStructuredFields | null): ERDEntity[] {
  const raw = fields?.entities;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is ERDEntity => isObject(item));
}

function getDFDNodes(fields: SummaryStructuredFields | null): DFDNode[] {
  const raw = fields?.nodes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is DFDNode => isObject(item));
}

function getSequenceMessages(
  fields: SummaryStructuredFields | null,
): SequenceMessage[] {
  const raw = fields?.messages;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is SequenceMessage => isObject(item));
}

function normalizeId(value: unknown): string {
  return asString(value).trim().toLowerCase();
}

function buildSequentialDisplayId(prefix: string, index: number): string {
  return `${prefix}-${String(index + 1).padStart(3, "0")}`.toLowerCase();
}

function computeCoverage(
  allNodes: NodeData[],
  contentMap: Record<string, SummaryContent>,
): CoverageMetric[] {
  const requirementFields = getFieldsByType(
    allNodes,
    contentMap,
    "requirements",
  );
  const userStoryFields = getFieldsByType(allNodes, contentMap, "user_stories");
  const useCaseFields = getFieldsByType(allNodes, contentMap, "use_cases");
  const flowchartFields = getFieldsByType(allNodes, contentMap, "flowchart");
  const sequenceFields = getFieldsByType(allNodes, contentMap, "sequence");
  const erdFields = getFieldsByType(allNodes, contentMap, "erd");
  const dfdFields = getFieldsByType(allNodes, contentMap, "dfd");
  const briefFields = getFieldsByType(allNodes, contentMap, "project_brief");

  const requirementItems = getRequirementItems(requirementFields);
  const userStories = getUserStoryItems(userStoryFields);
  const useCases = getUseCaseItems(useCaseFields);
  const flowchartFlows = getFlowchartFlows(flowchartFields);
  const sequenceMessages = getSequenceMessages(sequenceFields);
  const erdEntities = getERDEntities(erdFields);
  const dfdNodes = getDFDNodes(dfdFields);

  const metrics: CoverageMetric[] = [];

  const frItems = requirementItems.filter(
    (item) =>
      (item.type ?? "FR") === "FR" &&
      asString(item.description).trim().length > 0,
  );

  if (frItems.length > 0 || userStories.length > 0) {
    const mappedRequirements = new Set(
      userStories
        .map((story) => normalizeId(story.related_requirement))
        .filter(Boolean),
    );

    const covered = frItems.filter((fr, index) => {
      const internalId = normalizeId(fr.id);
      const displayId = buildSequentialDisplayId("FR", index);
      return (
        mappedRequirements.has(internalId) || mappedRequirements.has(displayId)
      );
    }).length;

    metrics.push({
      label: "FRs with User Stories",
      covered,
      total: frItems.length,
      description:
        "Functional requirements traced into at least one user story.",
    });
  }

  if (userStories.length > 0 || useCases.length > 0) {
    const relatedStoryIds = new Set<string>();

    useCases.forEach((useCase) => {
      const linkedStories = [
        ...asStringArray(useCase.related_user_stories),
        ...asStringArray(useCase.related_stories),
      ];

      linkedStories
        .map((storyId) => normalizeId(storyId))
        .filter(Boolean)
        .forEach((storyId) => relatedStoryIds.add(storyId));
    });

    const covered = userStories.filter((story) => {
      const storyId = normalizeId(story.id);
      return storyId.length > 0 && relatedStoryIds.has(storyId);
    }).length;

    metrics.push({
      label: "User Stories with Use Cases",
      covered,
      total: userStories.length,
      description: "User stories connected to downstream use cases.",
    });
  }

  if (useCases.length > 0 || flowchartFlows.length > 0) {
    const flowLinkedUseCases = new Set(
      flowchartFlows
        .map((flow) => normalizeId(flow.related_use_case))
        .filter(Boolean),
    );

    const covered = useCases.filter((useCase) => {
      const useCaseId = normalizeId(useCase.id);
      return useCaseId.length > 0 && flowLinkedUseCases.has(useCaseId);
    }).length;

    metrics.push({
      label: "Use Cases with Flowcharts",
      covered,
      total: useCases.length,
      description: "Use cases represented as procedural flows.",
    });
  }

  if (useCases.length > 0 || sequenceMessages.length > 0) {
    const relatedUseCase = normalizeId(sequenceFields?.related_use_case);
    const sequenceHasContent =
      sequenceMessages.length > 0 ||
      asStringArray(sequenceFields?.participants).length > 0;

    const covered = useCases.filter((useCase) => {
      const useCaseId = normalizeId(useCase.id);
      return (
        sequenceHasContent &&
        useCaseId.length > 0 &&
        useCaseId === relatedUseCase
      );
    }).length;

    metrics.push({
      label: "Use Cases with Sequence Coverage",
      covered,
      total: useCases.length,
      description: "Use cases backed by sequence interactions.",
    });
  }

  if (erdEntities.length > 0 || dfdNodes.length > 0) {
    const dataStoreNames = new Set(
      dfdNodes
        .filter((dfdNode) => dfdNode.type === "datastore")
        .map(
          (dfdNode) =>
            asString(dfdNode.related_erd_entity) || asString(dfdNode.label),
        )
        .map((label) => label.trim().toLowerCase())
        .filter(Boolean),
    );

    const covered = erdEntities.filter((entity) =>
      dataStoreNames.has(asString(entity.name).trim().toLowerCase()),
    ).length;

    metrics.push({
      label: "ERD Entities in DFD",
      covered,
      total: erdEntities.length,
      description: "Data stores aligned with the ERD model.",
    });
  }

  const briefTargetUsers = asStringArray(briefFields?.target_users).filter(
    (user) => user.trim().length > 0,
  );

  if (briefTargetUsers.length > 0 || userStories.length > 0) {
    const storyRoles = new Set(
      userStories
        .map((story) => asString(story.role).trim().toLowerCase())
        .filter(Boolean),
    );

    const covered = briefTargetUsers.filter((user) =>
      storyRoles.has(user.trim().toLowerCase()),
    ).length;

    metrics.push({
      label: "Target Users with Stories",
      covered,
      total: briefTargetUsers.length,
      description: "Target users represented in user story roles.",
    });
  }

  const scopeInItems = asStringArray(briefFields?.scope_in).filter(
    (scopeItem) => scopeItem.trim().length > 0,
  );

  if (scopeInItems.length > 0 || frItems.length > 0) {
    const linkedScopes = new Set(
      frItems
        .map((item) => asString(item.related_scope).trim().toLowerCase())
        .filter(Boolean),
    );

    const covered = scopeInItems.filter((scopeItem) =>
      linkedScopes.has(scopeItem.trim().toLowerCase()),
    ).length;

    metrics.push({
      label: "Scope In with FR Coverage",
      covered,
      total: scopeInItems.length,
      description: "Scope items mapped into functional requirements.",
    });
  }

  return metrics.filter((metric) => metric.total > 0);
}

function extractAPIEndpoints(
  contentMap: Record<string, SummaryContent>,
  allNodes: NodeData[],
): string[] {
  const sequenceNode = getNodeByType(allNodes, "sequence");
  if (!sequenceNode) return [];

  const sequenceFields = contentMap[sequenceNode.id]?.structured_fields ?? {};
  const messages = getSequenceMessages(sequenceFields);

  const endpoints = new Set<string>();

  messages.forEach((message) => {
    const content = asString(message.content).trim();
    if (!content) return;

    const httpMatch = content.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)/i);

    if (httpMatch) {
      endpoints.add(`${httpMatch[1].toUpperCase()} ${httpMatch[2].trim()}`);
      return;
    }

    if (/\/api\//i.test(content)) {
      endpoints.add(content);
    }
  });

  return Array.from(endpoints.values());
}

function formatMermaidError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Invalid Mermaid syntax.";
}

function MarkdownBlock({ value }: { value: string }) {
  if (!value.trim()) return null;

  return (
    <div className="text-sm prose dark:prose-invert max-w-none">
      <Markdown>{value}</Markdown>
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="border-b pb-1 text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function MermaidPreview({ syntax }: { syntax: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function renderDiagram() {
      if (!syntax.trim()) {
        if (!isCancelled) {
          setSvg("");
          setError(null);
        }
        return;
      }

      try {
        const id = `summary-mermaid-${crypto.randomUUID()}`;
        const rendered = await mermaid.render(id, syntax);

        if (!isCancelled) {
          setSvg(rendered.svg);
          setError(null);
        }
      } catch (renderError: unknown) {
        if (!isCancelled) {
          setSvg("");
          setError(formatMermaidError(renderError));
        }
      }
    }

    void renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [syntax]);

  return (
    <div className="rounded-md border bg-white p-4 min-h-25 overflow-x-auto">
      {error ? (
        <div className="rounded bg-red-50 p-4 text-sm text-red-500 dark:bg-red-950">
          {error}
        </div>
      ) : svg ? (
        <div
          className="mermaid-preview flex h-full w-full items-center justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No diagram available.</p>
      )}
    </div>
  );
}

function renderProjectBrief(fields: ProjectBriefFields) {
  const objectives = Array.isArray(fields.objectives) ? fields.objectives : [];
  const targetUsers = Array.isArray(fields.target_users)
    ? fields.target_users
    : [];
  const scopeIn = Array.isArray(fields.scope_in) ? fields.scope_in : [];
  const scopeOut = Array.isArray(fields.scope_out) ? fields.scope_out : [];
  const successMetrics = Array.isArray(fields.success_metrics)
    ? fields.success_metrics
    : [];
  const techStack = Array.isArray(fields.tech_stack) ? fields.tech_stack : [];
  const constraints = Array.isArray(fields.constraints)
    ? fields.constraints
    : [];
  const references = Array.isArray(fields.references) ? fields.references : [];

  return (
    <div className="space-y-4 text-sm">
      {fields.name && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Project Name:
          </span>{" "}
          {fields.name}
        </div>
      )}

      {fields.background && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Background / Why:
          </span>
          <p className="mt-1">{fields.background}</p>
        </div>
      )}

      {objectives.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Objectives:
          </span>
          <ul className="mt-1 list-disc pl-5">
            {objectives.map((objective, index) => (
              <li key={`${objective}-${index}`}>{objective}</li>
            ))}
          </ul>
        </div>
      )}

      {targetUsers.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Target Users:
          </span>{" "}
          {targetUsers.join(", ")}
        </div>
      )}

      {scopeIn.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">Scope In:</span>
          <ul className="mt-1 list-disc pl-5">
            {scopeIn.map((scopeItem, index) => (
              <li key={`${scopeItem}-${index}`}>{scopeItem}</li>
            ))}
          </ul>
        </div>
      )}

      {scopeOut.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Scope Out:
          </span>
          <ul className="mt-1 list-disc pl-5">
            {scopeOut.map((scopeItem, index) => (
              <li key={`${scopeItem}-${index}`}>{scopeItem}</li>
            ))}
          </ul>
        </div>
      )}

      {successMetrics.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Success Metrics:
          </span>
          <ul className="mt-1 list-disc pl-5">
            {successMetrics.map((metric, index) => {
              const metricName = asString(metric.metric);
              const target = asString(metric.target);
              if (!metricName && !target) return null;

              return (
                <li key={`${metricName}-${target}-${index}`}>
                  {metricName || "Metric"}
                  {target ? `: ${target}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {techStack.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Tech Stack:
          </span>{" "}
          {techStack.join(", ")}
        </div>
      )}

      {constraints.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Constraints:
          </span>
          <ul className="mt-1 list-disc pl-5">
            {constraints.map((constraint, index) => (
              <li key={`${constraint}-${index}`}>{constraint}</li>
            ))}
          </ul>
        </div>
      )}

      {references.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">
            References:
          </span>
          <ul className="mt-1 list-disc pl-5">
            {references.map((reference, index) => {
              const name = asString(reference.name);
              const url = asString(reference.url);
              if (!name && !url) return null;

              return (
                <li key={`${name}-${url}-${index}`}>
                  {name || "Reference"}
                  {url ? ` — ${url}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderRequirements(fields: SummaryStructuredFields) {
  const items = getRequirementItems(fields);

  if (items.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No requirements defined.
      </p>
    );
  }

  return (
    <ul className="list-disc space-y-2 pl-5 text-sm">
      {items.map((item, index) => {
        const priority = asString(item.priority) || "Unspecified";
        const description =
          asString(item.description) || "Untitled requirement";
        const type = asString(item.type || "FR");

        return (
          <li key={item.id ?? `${type}-${index}`}>
            <span className="font-semibold">
              [{type} · {priority}]
            </span>{" "}
            {description}
          </li>
        );
      })}
    </ul>
  );
}

function renderUserStories(fields: SummaryStructuredFields) {
  const items = getUserStoryItems(fields);

  if (items.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No user stories defined.
      </p>
    );
  }

  return (
    <ul className="space-y-3 text-sm">
      {items.map((item, index) => (
        <li
          key={item.id ?? `story-${index}`}
          className="rounded-md border bg-muted/30 p-3"
        >
          <strong>As a</strong> {asString(item.role) || "..."},{" "}
          <strong>I want</strong> {asString(item.goal) || "..."},{" "}
          <strong>so that</strong> {asString(item.benefit) || "..."}
        </li>
      ))}
    </ul>
  );
}

function renderUseCases(fields: SummaryStructuredFields) {
  const useCases = getUseCaseItems(fields);

  if (useCases.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No use cases defined.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {useCases.map((useCase, index) => {
        const mainFlow = Array.isArray(useCase.main_flow)
          ? useCase.main_flow
          : [];
        const preconditions = asStringArray(useCase.preconditions);
        const postconditions = asStringArray(useCase.postconditions);

        return (
          <div
            key={useCase.id ?? `uc-${index}`}
            className="rounded-md border bg-muted/20 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                UC-{String(index + 1).padStart(3, "0")}
              </span>
              <span className="font-semibold">
                {asString(useCase.name) || "Untitled Use Case"}
              </span>
            </div>

            {useCase.description && (
              <p className="mt-2 text-muted-foreground">
                {useCase.description}
              </p>
            )}

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div>
                <span className="font-semibold text-muted-foreground">
                  Primary Actor:
                </span>{" "}
                {asString(useCase.primary_actor) || "—"}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">
                  Secondary Actors:
                </span>{" "}
                {asStringArray(useCase.secondary_actors).join(", ") || "—"}
              </div>
            </div>

            {preconditions.length > 0 && (
              <div className="mt-3">
                <span className="font-semibold text-muted-foreground">
                  Preconditions:
                </span>
                <ul className="mt-1 list-disc pl-5">
                  {preconditions.map((item, itemIndex) => (
                    <li key={`${item}-${itemIndex}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {mainFlow.length > 0 && (
              <div className="mt-3">
                <span className="font-semibold text-muted-foreground">
                  Main Flow:
                </span>
                <ol className="mt-1 list-decimal pl-5">
                  {mainFlow.map((step, stepIndex) => (
                    <li key={`${useCase.id ?? index}-step-${stepIndex}`}>
                      {[asString(step.actor), asString(step.action)]
                        .filter((part) => part.trim().length > 0)
                        .join(": ") || "Unspecified step"}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {postconditions.length > 0 && (
              <div className="mt-3">
                <span className="font-semibold text-muted-foreground">
                  Postconditions:
                </span>
                <ul className="mt-1 list-disc pl-5">
                  {postconditions.map((item, itemIndex) => (
                    <li key={`${item}-${itemIndex}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderERDSummary(fields: SummaryStructuredFields) {
  const entities = getERDEntities(fields);

  if (entities.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No entities defined.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {entities.map((entity, index) => {
        const attributes = Array.isArray(entity.attributes)
          ? entity.attributes
          : [];

        return (
          <div
            key={entity.id ?? `entity-${index}`}
            className="rounded-md border bg-muted/20 p-3"
          >
            <div className="font-semibold">
              {asString(entity.name) || "Unnamed Entity"}
            </div>

            {entity.description && (
              <p className="mt-1 text-muted-foreground">{entity.description}</p>
            )}

            {attributes.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {attributes.map((attribute, attributeIndex) => {
                  const flags = [
                    attribute.isPrimaryKey ? "PK" : null,
                    attribute.isForeignKey ? "FK" : null,
                    attribute.isUnique ? "Unique" : null,
                    attribute.isIndex ? "Index" : null,
                  ].filter(Boolean);

                  return (
                    <li key={`${entity.id ?? index}-attr-${attributeIndex}`}>
                      <span className="font-mono">
                        {asString(attribute.name) || "column"}
                      </span>
                      {attribute.type ? ` : ${attribute.type}` : ""}
                      {flags.length > 0 ? ` (${flags.join(", ")})` : ""}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderFlowchartSummary(fields: SummaryStructuredFields) {
  const flows = getFlowchartFlows(fields);

  if (flows.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">No flows defined.</p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {flows.map((flow, index) => {
        const steps = Array.isArray(flow.steps) ? flow.steps : [];
        const connections = Array.isArray(flow.connections)
          ? flow.connections
          : [];

        return (
          <div
            key={flow.id ?? `flow-${index}`}
            className="rounded-md border bg-muted/20 p-3"
          >
            <div className="font-semibold">
              {asString(flow.name) || `Flow ${index + 1}`}
            </div>
            {flow.trigger && (
              <p className="mt-1 text-muted-foreground">
                Trigger: {flow.trigger}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {steps.length} steps · {connections.length} connections
            </p>
          </div>
        );
      })}
    </div>
  );
}

function renderSequenceSummary(fields: SummaryStructuredFields) {
  const rawParticipants = Array.isArray(fields.participants)
    ? fields.participants
    : [];
  const participants = rawParticipants
    .map((participant) =>
      typeof participant === "string"
        ? participant
        : asString(participant.name),
    )
    .filter((name) => name.trim().length > 0);

  const messages = getSequenceMessages(fields);

  if (participants.length === 0 && messages.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No sequence interactions defined.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {participants.length > 0 && (
        <div>
          <span className="font-semibold text-muted-foreground">
            Participants:
          </span>{" "}
          {participants.join(", ")}
        </div>
      )}

      {messages.length > 0 && (
        <ol className="list-decimal space-y-2 pl-5">
          {messages.map((message, index) => (
            <li key={message.id ?? `message-${index}`}>
              <span className="font-semibold">
                {asString(message.from) || "Unknown"} →{" "}
                {asString(message.to) || "Unknown"}:
              </span>{" "}
              {asString(message.content) || "No message content"}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function renderDFDSummary(fields: SummaryStructuredFields) {
  const nodes = getDFDNodes(fields);
  const flows = Array.isArray(fields.flows)
    ? fields.flows.filter((item): item is DFDFlow => isObject(item))
    : [];

  if (nodes.length === 0 && flows.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No DFD content defined.
      </p>
    );
  }

  const processCount = nodes.filter((node) => node.type === "process").length;
  const entityCount = nodes.filter((node) => node.type === "entity").length;
  const datastoreCount = nodes.filter(
    (node) => node.type === "datastore",
  ).length;

  return (
    <div className="space-y-2 text-sm">
      <p>
        <span className="font-semibold text-muted-foreground">Processes:</span>{" "}
        {processCount}
      </p>
      <p>
        <span className="font-semibold text-muted-foreground">
          External Entities:
        </span>{" "}
        {entityCount}
      </p>
      <p>
        <span className="font-semibold text-muted-foreground">
          Data Stores:
        </span>{" "}
        {datastoreCount}
      </p>
      <p>
        <span className="font-semibold text-muted-foreground">Flows:</span>{" "}
        {flows.length}
      </p>
    </div>
  );
}

function NodeSummarySection({
  node,
  content,
}: {
  node: NodeData;
  content: SummaryContent;
}) {
  const fields = content.structured_fields;
  const notes = asString(fields.notes);
  const diagramSyntax = asString(
    content.mermaid_manual || content.mermaid_auto,
  );
  const sqlSchema = asString(fields.sql);

  const guidedSummary = useMemo(() => {
    switch (node.type) {
      case "project_brief":
        return renderProjectBrief(fields as ProjectBriefFields);
      case "requirements":
        return renderRequirements(fields);
      case "user_stories":
        return renderUserStories(fields);
      case "use_cases":
        return renderUseCases(fields);
      case "erd":
        return renderERDSummary(fields);
      case "flowchart":
        return renderFlowchartSummary(fields);
      case "sequence":
        return renderSequenceSummary(fields);
      case "dfd":
        return renderDFDSummary(fields);
      default:
        return null;
    }
  }, [fields, node.type]);

  return (
    <div className="mb-6 overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
        <h3 className="font-semibold text-foreground">{node.label}</h3>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASS[node.status]}`}
          >
            {node.status}
          </span>
          <span className="text-[10px] font-mono uppercase text-muted-foreground">
            {node.type}
          </span>
        </div>
      </div>

      <div className="space-y-6 p-4">
        {guidedSummary}

        {notes.trim() && (
          <SummarySection title="Notes">
            <MarkdownBlock value={notes} />
          </SummarySection>
        )}

        {node.type === "erd" && sqlSchema.trim() && (
          <SummarySection title="SQL Schema">
            <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
              {sqlSchema}
            </pre>
          </SummarySection>
        )}

        {diagramSyntax.trim() && (
          <SummarySection title="Diagram">
            <MermaidPreview syntax={diagramSyntax} />
          </SummarySection>
        )}
      </div>
    </div>
  );
}

async function loadProjectSnapshot(
  projectId: string,
): Promise<ProjectSnapshot> {
  const [projectNodes, allContents, tasks, warnings] = await Promise.all([
    db.nodes.where({ project_id: projectId }).toArray(),
    db.nodeContents.toArray(),
    db.tasks.where({ project_id: projectId }).toArray(),
    db.validationWarnings.where({ project_id: projectId }).toArray(),
  ]);

  const displayNodes = projectNodes
    .filter(
      (projectNode) =>
        projectNode.type !== "summary" &&
        projectNode.type !== "task_board" &&
        projectNode.status !== "Empty",
    )
    .sort((left, right) => left.sort_order - right.sort_order);

  const contents = getNodeContentMap(projectNodes, allContents);

  return {
    allProjectNodes: projectNodes,
    displayNodes,
    contents,
    tasks,
    warnings,
  };
}

export function SummaryNodeEditor({
  node,
  onCloseAction,
}: SummaryNodeEditorProps) {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot>({
    allProjectNodes: [],
    displayNodes: [],
    contents: {},
    tasks: [],
    warnings: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      setIsLoading(true);

      const nextSnapshot = await loadProjectSnapshot(node.project_id);

      if (!isCancelled) {
        setSnapshot(nextSnapshot);
        setIsLoading(false);
      }
    }

    void run();

    return () => {
      isCancelled = true;
    };
  }, [node.project_id]);

  const nonSummaryNodes = useMemo(
    () =>
      snapshot.allProjectNodes.filter(
        (projectNode) => projectNode.type !== "summary",
      ),
    [snapshot.allProjectNodes],
  );

  const allNodesDone = useMemo(
    () =>
      nonSummaryNodes.length > 0 &&
      nonSummaryNodes.every((projectNode) => projectNode.status === "Done"),
    [nonSummaryNodes],
  );

  const errorWarnings = useMemo(
    () => snapshot.warnings.filter((warning) => warning.severity === "error"),
    [snapshot.warnings],
  );
  const warnWarnings = useMemo(
    () => snapshot.warnings.filter((warning) => warning.severity === "warning"),
    [snapshot.warnings],
  );
  const infoWarnings = useMemo(
    () => snapshot.warnings.filter((warning) => warning.severity === "info"),
    [snapshot.warnings],
  );

  const isProjectDone = allNodesDone && errorWarnings.length === 0;

  const coverage = useMemo(
    () => computeCoverage(snapshot.allProjectNodes, snapshot.contents),
    [snapshot.allProjectNodes, snapshot.contents],
  );

  const apiEndpoints = useMemo(
    () => extractAPIEndpoints(snapshot.contents, snapshot.allProjectNodes),
    [snapshot.contents, snapshot.allProjectNodes],
  );

  const tasksByPriority = useMemo(
    () => ({
      must: snapshot.tasks.filter(
        (task) => task.priority?.toLowerCase() === "must",
      ).length,
      should: snapshot.tasks.filter(
        (task) => task.priority?.toLowerCase() === "should",
      ).length,
      could: snapshot.tasks.filter(
        (task) => task.priority?.toLowerCase() === "could",
      ).length,
    }),
    [snapshot.tasks],
  );

  const tasksByStatus = useMemo(
    () => ({
      todo: snapshot.tasks.filter((task) => task.status === "todo").length,
      in_progress: snapshot.tasks.filter(
        (task) => task.status === "in_progress",
      ).length,
      done: snapshot.tasks.filter((task) => task.status === "done").length,
    }),
    [snapshot.tasks],
  );

  const incompleteNodeCount = nonSummaryNodes.filter(
    (projectNode) => projectNode.status !== "Done",
  ).length;

  return (
    <div className="relative z-20 flex h-full w-175 shrink-0 flex-col border-l bg-card shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.1)] transition-all">
      <div className="flex items-center justify-between border-b bg-muted/30 p-4 shrink-0">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            Project Summary
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Auto-compiled from your architecture workspace.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onCloseAction}
          className="rounded-full hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto bg-muted/10 p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading summary...
          </div>
        ) : snapshot.displayNodes.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
            No completed or in-progress nodes found. Start filling out your
            project nodes to see the summary.
          </div>
        ) : (
          <>
            <div
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                isProjectDone
                  ? "border-green-500/20 bg-green-500/10"
                  : "border-amber-500/20 bg-amber-500/10"
              }`}
            >
              {isProjectDone ? (
                <ShieldCheck className="h-6 w-6 shrink-0 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
              )}

              <div>
                <p
                  className={`text-sm font-semibold ${
                    isProjectDone
                      ? "text-green-700 dark:text-green-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {isProjectDone ? "Project Ready" : "Project Not Ready"}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {!allNodesDone &&
                    `${incompleteNodeCount} node(s) not marked Done. `}
                  {errorWarnings.length > 0 &&
                    `${errorWarnings.length} error(s) need fixing. `}
                  {isProjectDone &&
                    "All nodes completed with no errors. Ready to export and start building."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="flex flex-col items-center justify-center rounded-lg border bg-background p-4 text-center shadow-sm">
                <div className="mb-2 rounded-full bg-primary/10 p-2 text-primary">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">
                  {
                    nonSummaryNodes.filter(
                      (projectNode) => projectNode.status === "Done",
                    ).length
                  }
                  /{nonSummaryNodes.length}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  Nodes Done
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border bg-background p-4 text-center shadow-sm">
                <div className="mb-2 rounded-full bg-blue-500/10 p-2 text-blue-500">
                  <ListTodo className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">
                  {snapshot.tasks.length}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  Tasks
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border bg-background p-4 text-center shadow-sm">
                <div className="mb-2 rounded-full bg-green-500/10 p-2 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">
                  {tasksByStatus.done}/{snapshot.tasks.length}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  Tasks Done
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border bg-background p-4 text-center shadow-sm">
                <div
                  className={`mb-2 rounded-full p-2 ${
                    snapshot.warnings.length > 0
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-green-500/10 text-green-500"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">
                  {snapshot.warnings.length}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  Warnings
                </div>
              </div>
            </div>

            {coverage.length > 0 && (
              <div className="space-y-3">
                <h3 className="border-b pb-2 text-sm font-semibold">
                  Requirements Coverage
                </h3>

                <div className="space-y-3">
                  {coverage.map((metric, index) => {
                    const percentage =
                      metric.total > 0
                        ? Math.round((metric.covered / metric.total) * 100)
                        : 0;

                    return (
                      <div
                        key={`${metric.label}-${index}`}
                        className="space-y-1"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-50 shrink-0 text-xs text-muted-foreground">
                            {metric.label}
                          </span>

                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percentage === 100
                                  ? "bg-green-500"
                                  : percentage >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <span className="w-15 text-right font-mono text-xs">
                            {metric.covered}/{metric.total}
                          </span>
                        </div>

                        {metric.description && (
                          <p className="pl-53 text-[11px] text-muted-foreground">
                            {metric.description} ({percentage}%)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="border-b pb-2 text-sm font-semibold">
                Task Summary
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded border bg-background p-3">
                  <div className="text-lg font-bold text-red-600">
                    {tasksByPriority.must}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Must
                  </div>
                </div>
                <div className="rounded border bg-background p-3">
                  <div className="text-lg font-bold text-amber-600">
                    {tasksByPriority.should}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Should
                  </div>
                </div>
                <div className="rounded border bg-background p-3">
                  <div className="text-lg font-bold text-blue-600">
                    {tasksByPriority.could}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Could
                  </div>
                </div>
              </div>

              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{tasksByStatus.todo} todo</span>
                <span>·</span>
                <span>{tasksByStatus.in_progress} in progress</span>
                <span>·</span>
                <span>{tasksByStatus.done} done</span>
              </div>
            </div>

            {apiEndpoints.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 border-b pb-2 text-sm font-semibold">
                  <Globe className="h-4 w-4" />
                  API Endpoints ({apiEndpoints.length})
                </h3>

                <div className="space-y-1">
                  {apiEndpoints.map((endpoint, index) => {
                    const parts = endpoint.match(
                      /^(GET|POST|PUT|PATCH|DELETE)\s+(.+)/i,
                    );
                    const method = parts ? parts[1].toUpperCase() : "API";
                    const path = parts ? parts[2] : endpoint;

                    return (
                      <div
                        key={`${endpoint}-${index}`}
                        className="flex items-center gap-2 font-mono text-xs"
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            HTTP_METHOD_COLORS[method] ||
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {method}
                        </span>
                        <span>{path}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {snapshot.warnings.length > 0 && (
              <div className="space-y-3">
                <h3 className="border-b pb-2 text-sm font-semibold">
                  Validation Warnings
                </h3>

                {errorWarnings.length > 0 && (
                  <div className="space-y-1">
                    {errorWarnings.map((warning) => (
                      <div
                        key={warning.id}
                        className="flex items-start gap-2 text-xs"
                      >
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span className="text-red-700 dark:text-red-400">
                          {warning.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {warnWarnings.length > 0 && (
                  <div className="space-y-1">
                    {warnWarnings.map((warning) => (
                      <div
                        key={warning.id}
                        className="flex items-start gap-2 text-xs"
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="text-amber-700 dark:text-amber-400">
                          {warning.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {infoWarnings.length > 0 && (
                  <div className="space-y-1">
                    {infoWarnings.map((warning) => (
                      <div
                        key={warning.id}
                        className="flex items-start gap-2 text-xs"
                      >
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                        <span className="text-blue-700 dark:text-blue-400">
                          {warning.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <h3 className="border-b pb-2 pt-4 text-lg font-bold text-foreground">
              Architecture Documentation
            </h3>

            {snapshot.displayNodes.map((displayNode) => {
              const content = snapshot.contents[displayNode.id];
              if (!content) return null;

              return (
                <NodeSummarySection
                  key={displayNode.id}
                  node={displayNode}
                  content={content}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
