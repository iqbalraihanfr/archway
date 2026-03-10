"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db, NodeData, NodeContent, Attachment, TaskData } from "@/lib/db";
import { generateTasksFromNode } from "@/lib/taskEngine";
import { crossValidateAll } from "@/lib/validationEngine";
import { TaskBoardEditor } from "@/components/TaskBoardEditor";
import { SummaryNodeEditor } from "@/components/SummaryNodeEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Loader2,
  Check,
  UploadCloud,
  File,
  Trash2,
  Download,
  Sparkles,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import mermaid from "mermaid";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { exportDiagramToPNG } from "@/lib/exportEngine";
import { ProjectBriefEditor } from "@/components/editors/ProjectBriefEditor";
import { RequirementEditor } from "@/components/editors/RequirementEditor";
import { UserStoryEditor } from "@/components/editors/UserStoryEditor";
import { UseCaseEditor } from "@/components/editors/UseCaseEditor";
import { ERDEditor } from "@/components/editors/ERDEditor";
import { SequenceEditor } from "@/components/editors/SequenceEditor";
import { FlowchartEditor } from "@/components/editors/FlowchartEditor";
import { DFDEditor } from "@/components/editors/DFDEditor";
import { generateMermaid } from "@/lib/diagramGenerators";

const MERMAID_TEMPLATES: Record<string, string> = {
  flowchart: `flowchart TD
    A[Start] --> B[Process]
    B --> C{Decision?}
    C -- Yes --> D[Action]
    C -- No --> E[Other Action]
    D --> F[End]
    E --> F`,
  erd: `erDiagram
    USERS ||--|{ ORDERS : places
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : included_in

    USERS {
        string id PK
        string name
        string email
    }`,
  sequence: `sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Action
    Frontend->>Backend: API Request
    Backend->>Database: Query
    Database-->>Backend: Result
    Backend-->>Frontend: Response
    Frontend-->>User: Display`,
  use_case: `graph TD
    subgraph System
        UC1((Use Case 1))
        UC2((Use Case 2))
    end
    Actor1[Actor] --> UC1
    Actor1 --> UC2`,
  dfd: `graph LR
    EE1[External Entity] -->|data flow| P1((Process))
    P1 -->|output| DS1[(Data Store)]
    DS1 -->|read| P2((Process 2))
    P2 -->|result| EE2[External Entity 2]`,
};

const DIAGRAM_NODES = ["flowchart", "erd", "dfd", "use_case", "sequence"];
const GUIDED_NODE_TYPES = [
  "project_brief",
  "requirements",
  "user_stories",
  "use_cases",
  "erd",
  "sequence",
  "flowchart",
  "dfd",
];

type EditorTab = "guided" | "mermaid" | "sql" | "text" | "attachments";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

function getNodeTypeLabel(type: string) {
  switch (type) {
    case "project_brief":
      return "Project Brief";
    case "requirements":
      return "Requirements";
    case "user_stories":
      return "User Stories";
    case "use_cases":
      return "Use Cases";
    case "flowchart":
      return "Flowchart";
    case "dfd":
      return "DFD";
    case "erd":
      return "ERD";
    case "sequence":
      return "Sequence";
    case "task_board":
      return "Task Board";
    case "summary":
      return "Summary";
    default:
      return "Notes";
  }
}

function getStatusTone(status: NodeData["status"]) {
  if (status === "Done") {
    return "metric-pill metric-pill--success";
  }

  if (status === "In Progress") {
    return "metric-pill metric-pill--warning";
  }

  return "metric-pill metric-pill--info";
}

function SectionHint({
  title,
  description,
  tone = "default",
}: {
  title: string;
  description: string;
  tone?: "default" | "primary" | "muted";
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/20 bg-primary/8"
      : tone === "muted"
        ? "border-border/70 bg-muted/25"
        : "border-border/70 bg-background/60";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function TabBadge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "muted";
}) {
  return (
    <span
      className={
        tone === "primary"
          ? "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
          : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
      }
    >
      {label}
    </span>
  );
}

function EditorPanelHeader({
  node,
  isSaving,
  lastSaved,
  status,
  onStatusChange,
  onCloseAction,
  onDeleteAction,
}: {
  node: NodeData;
  isSaving: boolean;
  lastSaved: Date | null;
  status: NodeData["status"];
  onStatusChange: (status: string | null) => void;
  onCloseAction: () => void;
  onDeleteAction?: () => void;
}) {
  return (
    <>
      <div className="border-b border-border/70 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-readable-xs font-medium text-muted-foreground">
                {getNodeTypeLabel(node.type)}
              </span>
              <span className={getStatusTone(status)}>{status}</span>
            </div>

            <div>
              <h2 className="text-xl font-semibold leading-tight text-foreground">
                {node.label}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use the Guided tab as the main source of truth for this node.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden min-w-23 justify-end sm:flex">
              {isSaving ? (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </span>
              ) : null}
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
        </div>
      </div>

      <div className="border-b border-border/70 bg-muted/10 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-readable-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Status
            </Label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-9 w-47.5 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Empty">Empty</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {onDeleteAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteAction}
              className="self-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive lg:self-auto"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete node
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function GuidedOverview({
  hasGuidedEditor,
  isDiagram,
  isErd,
}: {
  hasGuidedEditor: boolean;
  isDiagram: boolean;
  isErd: boolean;
}) {
  return (
    <div className="space-y-3 px-5 pt-4">
      {hasGuidedEditor && (
        <SectionHint
          title="Recommended workflow"
          description="Start in Guided. The fields here drive validation, generated tasks, export output, and diagram generation."
          tone="primary"
        />
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <SectionHint
          title="Guided"
          description="Primary structured input. Best place to document the node clearly and consistently."
          tone="default"
        />
        {isDiagram && (
          <SectionHint
            title="Diagram"
            description="Generated from Guided fields. Use manual editing only when you need a custom override."
            tone="muted"
          />
        )}
        {isErd && (
          <SectionHint
            title="SQL Notes"
            description="Reference-only notes. Helpful for paste-in schemas, but not parsed back into Guided fields."
            tone="muted"
          />
        )}
      </div>
    </div>
  );
}

export function NodeEditorPanel({
  node,
  onCloseAction,
  onDeleteAction,
}: {
  node: NodeData;
  onCloseAction: () => void;
  onDeleteAction?: () => void;
}) {
  const isDiagram = DIAGRAM_NODES.includes(node.type);
  const isErd = node.type === "erd";
  const hasGuidedEditor = GUIDED_NODE_TYPES.includes(node.type);

  const [content, setContent] = useState<NodeContent | null>(null);
  const [status, setStatus] = useState<NodeData["status"]>(node.status);

  const [freeText, setFreeText] = useState("");
  const [mermaidSyntax, setMermaidSyntax] = useState("");
  const [sqlSchema, setSqlSchema] = useState("");
  const [guidedFields, setGuidedFields] = useState<Record<string, unknown>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  const [mermaidSvg, setMermaidSvg] = useState<string>("");
  const defaultTab: EditorTab = hasGuidedEditor
    ? "guided"
    : isDiagram
      ? "mermaid"
      : "text";

  const [activeTab, setActiveTab] = useState<EditorTab>(defaultTab);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      let data = await db.nodeContents.where({ node_id: node.id }).first();

      if (!data) {
        const newId = crypto.randomUUID();
        const now = new Date().toISOString();
        const initialContent: NodeContent = {
          id: newId,
          node_id: node.id,
          structured_fields: {},
          mermaid_auto: isDiagram ? MERMAID_TEMPLATES[node.type] || "" : "",
          mermaid_manual: "",
          updated_at: now,
        };

        await db.nodeContents.add(initialContent);
        data = initialContent;
      }

      const atts = await db.attachments.where({ node_id: node.id }).toArray();

      if (isMounted) {
        const structuredFields = data.structured_fields as Record<
          string,
          unknown
        >;

        setContent(data);
        setFreeText((structuredFields.notes as string | undefined) || "");
        setMermaidSyntax(data.mermaid_manual || data.mermaid_auto || "");
        setSqlSchema((structuredFields.sql as string | undefined) || "");

        let sf: Record<string, unknown> = structuredFields;

        if (node.type === "project_brief") {
          let migrated = false;

          if (sf.description && !sf.background) {
            sf = { ...sf, background: sf.description };
            delete sf.description;
            migrated = true;
          }

          if (typeof sf.target_user === "string" && !sf.target_users) {
            sf = {
              ...sf,
              target_users: sf.target_user
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
            };
            delete sf.target_user;
            migrated = true;
          }

          if (typeof sf.scope === "string" && !sf.scope_in) {
            sf = { ...sf, scope_in: sf.scope ? [sf.scope] : [] };
            delete sf.scope;
            migrated = true;
          }

          if (
            typeof sf.success_metrics === "string" &&
            !Array.isArray(sf.success_metrics)
          ) {
            sf = {
              ...sf,
              success_metrics: sf.success_metrics
                ? [{ metric: sf.success_metrics, target: "" }]
                : [],
            };
            migrated = true;
          }

          if (
            typeof sf.constraints === "string" &&
            !Array.isArray(sf.constraints)
          ) {
            sf = {
              ...sf,
              constraints: sf.constraints ? [sf.constraints] : [],
            };
            migrated = true;
          }

          if (
            typeof sf.tech_stack === "string" &&
            !Array.isArray(sf.tech_stack)
          ) {
            sf = {
              ...sf,
              tech_stack: sf.tech_stack
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
            };
            migrated = true;
          }

          if (migrated) {
            await db.nodeContents.update(data.id, { structured_fields: sf });
          }
        }

        setGuidedFields(sf);
        setAttachments(atts);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [node.id, node.type, isDiagram]);

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus) return;
    const validStatus = newStatus as NodeData["status"];
    setStatus(validStatus);
    await db.nodes.update(node.id, {
      status: validStatus,
      updated_at: new Date().toISOString(),
    });
  };

  useEffect(() => {
    if (!content) return;

    const restGuidedFields = Object.fromEntries(
      Object.entries(guidedFields).filter(
        ([key]) => key !== "sql" && key !== "notes",
      ),
    ) as Record<string, unknown>;

    const contentFields = (content.structured_fields || {}) as Record<
      string,
      unknown
    >;

    const contentSql = contentFields.sql;
    const contentNotes = contentFields.notes;

    const restContentGuidedFields = Object.fromEntries(
      Object.entries(contentFields).filter(
        ([key]) => key !== "sql" && key !== "notes",
      ),
    ) as Record<string, unknown>;

    const hasChanges =
      freeText !== ((contentNotes as string | undefined) || "") ||
      mermaidSyntax !==
        (content.mermaid_manual || content.mermaid_auto || "") ||
      sqlSchema !== ((contentSql as string | undefined) || "") ||
      JSON.stringify(restGuidedFields) !==
        JSON.stringify(restContentGuidedFields);

    const autoMermaid = isDiagram
      ? generateMermaid(node.type, guidedFields)
      : content.mermaid_auto;

    if (!hasChanges && autoMermaid === content.mermaid_auto) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);

      const now = new Date().toISOString();
      const updatedFields: Record<string, unknown> = {
        ...guidedFields,
        notes: freeText,
        sql: sqlSchema,
      };

      await db.nodeContents.update(content.id, {
        mermaid_manual: mermaidSyntax,
        mermaid_auto: autoMermaid,
        structured_fields: updatedFields,
        updated_at: now,
      });

      await db.nodes.update(node.id, { updated_at: now });

      setContent((prev) =>
        prev
          ? {
              ...prev,
              mermaid_manual: mermaidSyntax,
              mermaid_auto: autoMermaid,
              structured_fields: updatedFields,
              updated_at: now,
            }
          : null,
      );

      const updatedContent: NodeContent = {
        ...content,
        mermaid_manual: mermaidSyntax,
        mermaid_auto: autoMermaid,
        structured_fields: updatedFields,
        updated_at: now,
      };

      const generatedTasks = generateTasksFromNode(
        node,
        updatedContent,
        node.project_id,
      );

      const existingTasks = await db.tasks
        .where({ source_node_id: node.id })
        .toArray();
      const existingAutoTasksMap = new Map<
        string,
        TaskData & { source_item_id: string }
      >();

      existingTasks.forEach((task) => {
        if (!task.is_manual && task.source_item_id) {
          existingAutoTasksMap.set(task.source_item_id, {
            ...task,
            source_item_id: task.source_item_id,
          });
        }
      });

      const tasksToPut: TaskData[] = [];
      const tasksToKeepIds = new Set<string>();

      for (const generatedTask of generatedTasks) {
        if (
          generatedTask.source_item_id &&
          existingAutoTasksMap.has(generatedTask.source_item_id)
        ) {
          const existing = existingAutoTasksMap.get(
            generatedTask.source_item_id,
          );

          if (!existing) continue;

          tasksToPut.push({
            ...existing,
            title: generatedTask.title,
            description: generatedTask.description,
            group_key: generatedTask.group_key,
            priority: generatedTask.priority,
            labels: generatedTask.labels,
            status: generatedTask.status,
            sort_order: generatedTask.sort_order,
            updated_at: now,
          });
          tasksToKeepIds.add(existing.id);
        } else {
          tasksToPut.push({
            ...generatedTask,
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
          });
        }
      }

      const autoTaskIdsToDelete = existingTasks
        .filter((task) => !task.is_manual && !tasksToKeepIds.has(task.id))
        .map((task) => task.id);

      if (autoTaskIdsToDelete.length > 0) {
        await db.tasks.bulkDelete(autoTaskIdsToDelete);
      }

      if (tasksToPut.length > 0) {
        await db.tasks.bulkPut(tasksToPut);
      }

      await crossValidateAll(node.project_id);

      setIsSaving(false);
      setLastSaved(new Date());
    }, 1000);

    debounceTimeoutRef.current = timeout;

    return () => {
      clearTimeout(timeout);
    };
  }, [
    freeText,
    mermaidSyntax,
    sqlSchema,
    content,
    node,
    guidedFields,
    isDiagram,
  ]);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!isDiagram || !mermaidSyntax.trim()) {
        setMermaidSvg("");
        setMermaidError(null);
        return;
      }

      try {
        const id = `mermaid-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, mermaidSyntax);
        setMermaidSvg(svg);
        setMermaidError(null);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Invalid Mermaid syntax";
        setMermaidSvg("");
        setMermaidError(message);
      }
    };

    const renderTimeout = setTimeout(() => {
      void renderDiagram();
    }, 500);

    return () => clearTimeout(renderTimeout);
  }, [mermaidSyntax, isDiagram]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newAtts: Attachment[] = [];
      const now = new Date().toISOString();

      for (const file of acceptedFiles) {
        const attId = crypto.randomUUID();
        const attachment: Attachment = {
          id: attId,
          node_id: node.id,
          filename: file.name,
          mime_type: file.type,
          size: file.size,
          data: file,
          created_at: now,
        };
        await db.attachments.add(attachment);
        newAtts.push(attachment);
      }

      setAttachments((prev) => [...prev, ...newAtts]);
    },
    [node.id],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const deleteAttachment = async (attId: string) => {
    await db.attachments.delete(attId);
    setAttachments((prev) =>
      prev.filter((attachment) => attachment.id !== attId),
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (!node) return null;

  if (node.type === "task_board") {
    return <TaskBoardEditor node={node} onCloseAction={onCloseAction} />;
  }

  if (node.type === "summary") {
    return <SummaryNodeEditor node={node} onCloseAction={onCloseAction} />;
  }

  return (
    <div className="flex h-full w-160 shrink-0 flex-col border-l border-border/70 bg-card shadow-[-10px_0_24px_-10px_rgba(0,0,0,0.12)]">
      <EditorPanelHeader
        node={node}
        isSaving={isSaving}
        lastSaved={lastSaved}
        status={status}
        onStatusChange={handleStatusChange}
        onCloseAction={onCloseAction}
        onDeleteAction={onDeleteAction}
      />

      <div className="flex min-h-0 flex-1 flex-col bg-card">
        <GuidedOverview
          hasGuidedEditor={hasGuidedEditor}
          isDiagram={isDiagram}
          isErd={isErd}
        />

        <Tabs
          key={node.id}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as EditorTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="px-5 pb-3 pt-4">
            <TabsList className="flex h-auto w-full flex-wrap gap-2 rounded-2xl bg-muted/45 p-2">
              {hasGuidedEditor && (
                <TabsTrigger
                  className="min-h-10.5 flex-1 rounded-xl px-3 py-2 text-sm"
                  value="guided"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Guided</span>
                    <TabBadge label="Primary" tone="primary" />
                  </div>
                </TabsTrigger>
              )}

              {isDiagram && (
                <TabsTrigger
                  className="min-h-10.5 flex-1 rounded-xl px-3 py-2 text-sm"
                  value="mermaid"
                >
                  <div className="flex items-center gap-2">
                    <span>Diagram</span>
                    <TabBadge label="Advanced" tone="muted" />
                  </div>
                </TabsTrigger>
              )}

              {isErd && (
                <TabsTrigger
                  className="min-h-10.5 flex-1 rounded-xl px-3 py-2 text-sm"
                  value="sql"
                >
                  <div className="flex items-center gap-2">
                    <span>SQL Notes</span>
                    <TabBadge label="Reference" tone="muted" />
                  </div>
                </TabsTrigger>
              )}

              <TabsTrigger
                className="min-h-10.5 flex-1 rounded-xl px-3 py-2 text-sm"
                value="text"
              >
                <div className="flex items-center gap-2">
                  <span>Notes</span>
                  <TabBadge label="Reference" tone="muted" />
                </div>
              </TabsTrigger>

              <TabsTrigger
                className="min-h-10.5 flex-1 rounded-xl px-3 py-2 text-sm"
                value="attachments"
              >
                <div className="flex items-center gap-2">
                  <span>Files</span>
                  <TabBadge label="Reference" tone="muted" />
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="relative flex min-h-0 flex-1">
            {hasGuidedEditor && (
              <TabsContent
                value="guided"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="px-5 pb-3">
                  <SectionHint
                    title="Guided is your main editing mode"
                    description="Fill this tab first. Structured data here powers generated diagrams, tasks, validation, and exports across the workspace."
                    tone="primary"
                  />
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  {node.type === "project_brief" && (
                    <ProjectBriefEditor
                      fields={guidedFields}
                      onChange={(fields) =>
                        setGuidedFields(fields as Record<string, unknown>)
                      }
                      projectId={node.project_id}
                    />
                  )}
                  {node.type === "requirements" && (
                    <RequirementEditor
                      fields={guidedFields}
                      onChange={(fields) =>
                        setGuidedFields(fields as Record<string, unknown>)
                      }
                      projectId={node.project_id}
                    />
                  )}
                  {node.type === "user_stories" && (
                    <UserStoryEditor
                      fields={guidedFields}
                      onChange={(fields) =>
                        setGuidedFields(fields as Record<string, unknown>)
                      }
                      projectId={node.project_id}
                    />
                  )}
                  {node.type === "use_cases" && (
                    <UseCaseEditor
                      fields={guidedFields}
                      onChange={(fields) =>
                        setGuidedFields(fields as Record<string, unknown>)
                      }
                      projectId={node.project_id}
                    />
                  )}
                  {node.type === "erd" && (
                    <ERDEditor
                      fields={guidedFields}
                      onChange={(fields) =>
                        setGuidedFields(fields as Record<string, unknown>)
                      }
                      projectId={node.project_id}
                    />
                  )}
                  {node.type === "sequence" && (
                    <SequenceEditor
                      fields={guidedFields}
                      onChange={(fields) =>
                        setGuidedFields(fields as Record<string, unknown>)
                      }
                      projectId={node.project_id}
                    />
                  )}
                  {node.type === "flowchart" && (
                    <FlowchartEditor
                      fields={guidedFields}
                      onChange={(fields) =>
                        setGuidedFields(fields as Record<string, unknown>)
                      }
                      projectId={node.project_id}
                    />
                  )}
                  {node.type === "dfd" && (
                    <DFDEditor
                      fields={guidedFields}
                      onChange={(fields) =>
                        setGuidedFields(fields as Record<string, unknown>)
                      }
                      projectId={node.project_id}
                    />
                  )}
                </div>
              </TabsContent>
            )}

            {isDiagram && (
              <TabsContent
                value="mermaid"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-5"
              >
                <div className="grid gap-3 pb-4 pt-1">
                  <SectionHint
                    title="Diagram editor"
                    description="This view reflects Guided content first. Only make manual changes here when you intentionally want to override the generated diagram."
                    tone="muted"
                  />
                </div>

                <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="min-h-0 overflow-hidden rounded-2xl border border-border/70 bg-background">
                    <CodeMirror
                      value={mermaidSyntax}
                      height="100%"
                      extensions={[javascript()]}
                      onChange={(value) => setMermaidSyntax(value)}
                      theme="dark"
                      className="h-full text-sm"
                    />
                  </div>

                  <div className="relative flex min-h-0 items-center justify-center overflow-auto rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    {!mermaidError && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (mermaidRef.current) {
                            exportDiagramToPNG(
                              mermaidRef.current,
                              `${node.label}-diagram`,
                            );
                          }
                        }}
                        className="absolute right-3 top-3 rounded-full"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export PNG
                      </Button>
                    )}

                    {mermaidError ? (
                      <div className="absolute inset-0 overflow-auto bg-background/95 p-4 text-sm text-destructive">
                        <div className="mb-2 font-semibold uppercase tracking-[0.14em]">
                          Mermaid syntax error
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                          {mermaidError}
                        </pre>
                      </div>
                    ) : (
                      <div
                        ref={mermaidRef}
                        dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                        className="mermaid-preview flex h-full w-full items-center justify-center bg-white"
                      />
                    )}

                    {!mermaidSvg && !mermaidError && (
                      <span className="text-sm text-muted-foreground">
                        Rendering live preview...
                      </span>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}

            {isErd && (
              <TabsContent
                value="sql"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-5"
              >
                <div className="pb-4 pt-1">
                  <SectionHint
                    title="Reference-only SQL notes"
                    description="Paste CREATE TABLE statements or schema references here. This content is stored as notes and does not sync back into Guided fields automatically."
                    tone="muted"
                  />
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  <Label className="text-sm font-semibold text-foreground">
                    SQL schema notes
                  </Label>
                  <Textarea
                    className="min-h-0 flex-1 resize-none bg-background font-mono text-sm leading-6"
                    placeholder={`CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100)
);`}
                    value={sqlSchema}
                    onChange={(event) => setSqlSchema(event.target.value)}
                  />
                </div>
              </TabsContent>
            )}

            <TabsContent
              value="text"
              className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-5"
            >
              <div className="pb-4 pt-1">
                <SectionHint
                  title="Freeform notes"
                  description="Use this space for supporting context, rough thinking, or references. These notes do not drive generated diagrams, tasks, or validation."
                  tone="muted"
                />
              </div>

              <Textarea
                className="min-h-0 flex-1 resize-none bg-background text-sm leading-7 shadow-inner"
                placeholder="Additional context, assumptions, references, or working notes..."
                value={freeText}
                onChange={(event) => setFreeText(event.target.value)}
              />
            </TabsContent>

            <TabsContent
              value="attachments"
              className="m-0 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5"
            >
              <div className="pb-4 pt-1">
                <SectionHint
                  title="Reference files"
                  description="Store supporting documents such as briefs, quotations, mockups, or specs. Files are saved for reference only and are not parsed automatically."
                  tone="muted"
                />
              </div>

              <div
                {...getRootProps()}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/45 hover:bg-secondary/40"
                }`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <p className="text-base font-medium text-foreground">
                  Drag and drop files here
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or click to browse your device
                </p>
                <p className="mt-4 text-readable-xs text-muted-foreground">
                  PDF, DOCX, images, markdown, and related references
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="mt-5 flex min-h-0 flex-1 flex-col">
                  <h3 className="border-b border-border/70 pb-2 text-sm font-semibold text-foreground">
                    Attached files ({attachments.length})
                  </h3>
                  <div className="workspace-scroll mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 shadow-sm transition-colors hover:bg-muted/25"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <File className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-medium text-foreground"
                              title={attachment.filename}
                            >
                              {attachment.filename}
                            </p>
                            <p className="mt-0.5 text-readable-xs text-muted-foreground">
                              {formatSize(attachment.size)}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteAttachment(attachment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
