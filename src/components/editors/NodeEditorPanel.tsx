"use client";

import { useState } from "react";
import { type NodeData } from "@/lib/db";
import { TaskBoardEditor } from "@/components/editors/TaskBoardEditor";
import { SummaryNodeEditor } from "@/components/editors/SummaryNodeEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";

import {
  DIAGRAM_NODES,
  GUIDED_NODE_TYPES,
  type EditorTab,
} from "./panel/constants";
import {
  EditorPanelHeader,
  GuidedOverview,
} from "./panel/components";
import { AttachmentsTab } from "./panel/AttachmentsTab";
import { GuidedEditorContent } from "./panel/GuidedEditorContent";

// Custom Hooks
import { useNodeEditorData } from "./hooks/useNodeEditorData";
import { useNodeSync } from "./hooks/useNodeSync";
import { useMermaidRenderer } from "./hooks/useMermaidRenderer";
import { useAttachments } from "./hooks/useAttachments";

// Sub-components
import { MermaidEditor } from "./panel/MermaidEditor";
import { NotesEditor } from "./panel/NotesEditor";
import { SqlNotesEditor } from "./panel/SqlNotesEditor";

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

  // Data Loading & Basic State
  const {
    content,
    setContent,
    status,
    setStatus,
    freeText,
    setFreeText,
    mermaidSyntax,
    setMermaidSyntax,
    sqlSchema,
    setSqlSchema,
    guidedFields,
    setGuidedFields,
    attachments,
    setAttachments,
    isLoading,
  } = useNodeEditorData(node);

  // Sync Logic (Auto-save, Task generation, Validation)
  const { isSaving, lastSaved } = useNodeSync({
    node,
    content,
    setContent,
    freeText,
    mermaidSyntax,
    sqlSchema,
    guidedFields,
  });

  // Diagram Rendering
  const { mermaidSvg, mermaidError } = useMermaidRenderer(node.type, mermaidSyntax);

  // Attachment Actions
  const { onDrop, deleteAttachment } = useAttachments(node.id, attachments, setAttachments);

  // Diagram-first nodes: Mermaid code is the primary input, guided is secondary
  const DIAGRAM_FIRST = ["flowchart", "dfd", "sequence"];
  const defaultTab: EditorTab = DIAGRAM_FIRST.includes(node.type)
    ? "mermaid"
    : hasGuidedEditor
      ? "guided"
      : isDiagram
        ? "mermaid"
        : "text";

  const [activeTab, setActiveTab] = useState<EditorTab>(defaultTab);

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus) return;
    setStatus(newStatus as NodeData["status"]);
    // Actual DB update happens here since it's a simple discrete action
    const { db } = await import("@/lib/db");
    await db.nodes.update(node.id, {
      status: newStatus as NodeData["status"],
      updated_at: new Date().toISOString(),
    });
  };

  if (node.type === "task_board") {
    return <TaskBoardEditor node={node} onCloseAction={onCloseAction} />;
  }

  if (node.type === "summary") {
    return <SummaryNodeEditor node={node} onCloseAction={onCloseAction} />;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col bg-card/40 backdrop-blur-md">
      <EditorPanelHeader
        node={node}
        isSaving={isSaving}
        lastSaved={lastSaved}
        status={status}
        onStatusChange={handleStatusChange}
        onCloseAction={onCloseAction}
        onDeleteAction={onDeleteAction}
      />

      <div className="flex min-h-0 flex-1 flex-col bg-background/30 transition-colors">
        <Tabs
          key={node.id}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as EditorTab)}
          className="workspace-scroll flex flex-1 flex-col overflow-y-auto overflow-x-hidden"
        >
          <div className="pt-2">
            <GuidedOverview
              hasGuidedEditor={hasGuidedEditor}
              isDiagram={isDiagram}
              isErd={isErd}
            />
          </div>

          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm px-6 py-4">
            <TabsList className="flex h-12 w-full items-center gap-1.5 rounded-2xl bg-muted/50 p-1.5 shadow-sm">
              {hasGuidedEditor && (
                <TabsTrigger
                  className="h-full flex-1 rounded-xl px-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  value="guided"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Guided</span>
                  </div>
                </TabsTrigger>
              )}

              {isDiagram && (
                <TabsTrigger
                  className="h-full flex-1 rounded-xl px-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  value="mermaid"
                >
                  Diagram
                </TabsTrigger>
              )}

              {isErd && (
                <TabsTrigger
                  className="h-full flex-1 rounded-xl px-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  value="sql"
                >
                  SQL Notes
                </TabsTrigger>
              )}

              <TabsTrigger
                className="h-full flex-1 rounded-xl px-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                value="text"
              >
                Notes
              </TabsTrigger>

              <TabsTrigger
                className="h-full flex-1 rounded-xl px-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                value="attachments"
              >
                Files
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="relative flex min-h-0 flex-1">
            {hasGuidedEditor && (
              <TabsContent value="guided" className="m-0 flex flex-1 flex-col">
                <div className="flex-1">
                  <GuidedEditorContent
                    type={node.type}
                    fields={guidedFields}
                    onChange={(fields) =>
                      setGuidedFields(fields as Record<string, unknown>)
                    }
                    projectId={node.project_id}
                  />
                </div>
              </TabsContent>
            )}

            {isDiagram && (
              <TabsContent value="mermaid" className="m-0 flex-1 outline-none">
                <MermaidEditor
                  mermaidSyntax={mermaidSyntax}
                  onSyntaxChange={setMermaidSyntax}
                  mermaidSvg={mermaidSvg}
                  mermaidError={mermaidError}
                  nodeLabel={node.label}
                />
              </TabsContent>
            )}

            {isErd && (
              <TabsContent value="sql" className="m-0 flex flex-1 flex-col outline-none">
                <SqlNotesEditor value={sqlSchema} onChange={setSqlSchema} />
              </TabsContent>
            )}

            <TabsContent value="text" className="m-0 flex-1 outline-none">
              <NotesEditor value={freeText} onChange={setFreeText} />
            </TabsContent>

            <TabsContent value="attachments" className="m-0 flex-1 outline-none">
              <AttachmentsTab
                attachments={attachments}
                onDropAction={(files) => void onDrop(files)}
                onDeleteAction={(id) => void deleteAttachment(id)}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
