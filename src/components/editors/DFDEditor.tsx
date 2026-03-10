import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { EditorProps } from "./ProjectBriefEditor";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

type UseCaseItem = {
  id: string;
  name?: string;
};

type ERDEntityItem = {
  id: string;
  name?: string;
};

type DFDNodeType = "process" | "entity" | "datastore";

type DFDNode = {
  id: string;
  label: string;
  type: DFDNodeType;
  related_use_case?: string;
  related_uc?: string; // backward compatibility
  related_erd_entity?: string;
};

type DFDFlow = {
  id: string;
  from: string;
  to: string;
  label: string;
};

type DFDFields = {
  nodes?: DFDNode[];
  flows?: DFDFlow[];
};

function useUseCases(projectId?: string) {
  return useLiveQuery(
    async (): Promise<UseCaseItem[]> => {
      if (!projectId) return [];
      const node = await db.nodes
        .where({ project_id: projectId, type: "use_cases" })
        .first();
      if (!node) return [];
      const content = await db.nodeContents.where({ node_id: node.id }).first();
      const raw = content?.structured_fields?.useCases;
      return Array.isArray(raw) ? (raw as UseCaseItem[]) : [];
    },
    [projectId],
    [],
  );
}

function useERDEntities(projectId?: string) {
  return useLiveQuery(
    async (): Promise<ERDEntityItem[]> => {
      if (!projectId) return [];
      const node = await db.nodes
        .where({ project_id: projectId, type: "erd" })
        .first();
      if (!node) return [];
      const content = await db.nodeContents.where({ node_id: node.id }).first();
      const raw = content?.structured_fields?.entities;
      return Array.isArray(raw) ? (raw as ERDEntityItem[]) : [];
    },
    [projectId],
    [],
  );
}

function validateDFDFlow(fromNode?: DFDNode, toNode?: DFDNode): string | null {
  if (!fromNode || !toNode) return null;

  // External Entity cannot connect directly to another External Entity or Data Store
  if (
    fromNode.type === "entity" &&
    (toNode.type === "entity" || toNode.type === "datastore")
  ) {
    return `External Entity cannot connect directly to ${
      toNode.type === "entity" ? "another External Entity" : "a Data Store"
    }.`;
  }

  // Data Store cannot connect directly to External Entity or Data Store
  if (fromNode.type === "datastore" && toNode.type === "entity") {
    return "Data Store cannot connect directly to External Entity.";
  }

  if (fromNode.type === "datastore" && toNode.type === "datastore") {
    return "Data Store cannot connect directly to another Data Store.";
  }

  return null;
}

function normalizeNode(node: DFDNode): DFDNode {
  return {
    ...node,
    related_use_case: node.related_use_case ?? node.related_uc ?? "",
    related_uc: node.related_uc ?? node.related_use_case ?? "",
  };
}

export function DFDEditor({ fields, onChange, projectId }: EditorProps) {
  const useCases = useUseCases(projectId) ?? [];
  const erdEntities = useERDEntities(projectId) ?? [];

  const typedFields = fields as DFDFields;
  const nodes: DFDNode[] = (typedFields.nodes ?? []).map(normalizeNode);
  const flows: DFDFlow[] = typedFields.flows ?? [];

  const updateNodes = (newNodes: DFDNode[]) =>
    onChange({ ...fields, nodes: newNodes });

  const updateFlows = (newFlows: DFDFlow[]) =>
    onChange({ ...fields, flows: newFlows });

  const addNode = (type: DFDNodeType) =>
    updateNodes([
      ...nodes,
      {
        id: crypto.randomUUID(),
        label: "",
        type,
        related_use_case: "",
        related_uc: "",
        related_erd_entity: "",
      },
    ]);

  const updateNode = (id: string, updates: Partial<DFDNode>) =>
    updateNodes(
      nodes.map((node) =>
        node.id === id
          ? normalizeNode({
              ...node,
              ...updates,
            })
          : node,
      ),
    );

  const removeNode = (id: string) =>
    updateNodes(nodes.filter((node) => node.id !== id));

  const addFlow = () =>
    updateFlows([
      ...flows,
      { id: crypto.randomUUID(), from: "", to: "", label: "" },
    ]);

  const updateFlow = (id: string, updates: Partial<DFDFlow>) =>
    updateFlows(
      flows.map((flow) => (flow.id === id ? { ...flow, ...updates } : flow)),
    );

  const removeFlow = (id: string) =>
    updateFlows(flows.filter((flow) => flow.id !== id));

  const getFlowError = (flow: DFDFlow) => {
    const fromNode = nodes.find((node) => node.id === flow.from);
    const toNode = nodes.find((node) => node.id === flow.to);
    return validateDFDFlow(fromNode, toNode);
  };

  const typeLabel = (type: DFDNodeType) => {
    if (type === "process") return "⚙ Process";
    if (type === "entity") return "◻ Ext. Entity";
    return "⊞ Data Store";
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Components</Label>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNode("process")}
              className="h-7 text-[10px]"
            >
              + Process
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNode("entity")}
              className="h-7 text-[10px]"
            >
              + Ext Entity
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNode("datastore")}
              className="h-7 text-[10px]"
            >
              + Data Store
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="space-y-2 rounded-md border bg-background p-2 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 rounded bg-muted px-1.5 py-0.5 text-center font-mono text-[10px]">
                  {typeLabel(node.type)}
                </span>

                <Input
                  value={node.label || ""}
                  onChange={(event) =>
                    updateNode(node.id, { label: event.target.value })
                  }
                  placeholder="Name..."
                  className="h-8 flex-1 text-xs"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeNode(node.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {node.type === "process" && useCases.length > 0 && (
                <div className="flex items-center gap-2 pl-26">
                  <Label className="shrink-0 text-[10px] text-muted-foreground">
                    Related UC:
                  </Label>
                  <select
                    value={node.related_use_case || ""}
                    onChange={(event) =>
                      updateNode(node.id, {
                        related_use_case: event.target.value,
                        related_uc: event.target.value, // keep old key in sync
                      })
                    }
                    className="h-6 flex-1 rounded border bg-background px-1 text-[10px]"
                  >
                    <option value="">None</option>
                    {useCases.map((uc, index) => (
                      <option key={uc.id} value={uc.id}>
                        UC-{String(index + 1).padStart(3, "0")}:{" "}
                        {uc.name || "Untitled"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {node.type === "datastore" && erdEntities.length > 0 && (
                <div className="flex items-center gap-2 pl-26">
                  <Label className="shrink-0 text-[10px] text-muted-foreground">
                    ERD Entity:
                  </Label>
                  <select
                    value={node.related_erd_entity || ""}
                    onChange={(event) =>
                      updateNode(node.id, {
                        related_erd_entity: event.target.value,
                      })
                    }
                    className="h-6 flex-1 rounded border bg-background px-1 text-[10px]"
                  >
                    <option value="">None</option>
                    {erdEntities.map((entity) => (
                      <option key={entity.id} value={entity.name}>
                        {entity.name || "Unnamed"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}

          {nodes.length === 0 && (
            <div className="rounded border border-dashed p-2 text-center text-xs italic text-muted-foreground">
              No components defined.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Data Flows</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={addFlow}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 h-3 w-3" /> Add Flow
          </Button>
        </div>

        <div className="space-y-2">
          {flows.map((flow) => {
            const error = getFlowError(flow);

            return (
              <div key={flow.id} className="space-y-1">
                <div className="flex flex-col gap-2 rounded-md border bg-background p-2 shadow-sm sm:flex-row sm:items-center">
                  <select
                    value={flow.from || ""}
                    onChange={(event) =>
                      updateFlow(flow.id, { from: event.target.value })
                    }
                    className="h-8 w-full truncate rounded border bg-background px-1 text-xs sm:w-1/3"
                  >
                    <option value="">From...</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        [{node.type}] {node.label || node.id.substring(0, 6)}
                      </option>
                    ))}
                  </select>

                  <span className="hidden text-muted-foreground sm:block">
                    →
                  </span>

                  <select
                    value={flow.to || ""}
                    onChange={(event) =>
                      updateFlow(flow.id, { to: event.target.value })
                    }
                    className="h-8 w-full truncate rounded border bg-background px-1 text-xs sm:w-1/3"
                  >
                    <option value="">To...</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        [{node.type}] {node.label || node.id.substring(0, 6)}
                      </option>
                    ))}
                  </select>

                  <Input
                    value={flow.label || ""}
                    onChange={(event) =>
                      updateFlow(flow.id, { label: event.target.value })
                    }
                    placeholder="Data label"
                    className="h-8 flex-1 text-xs"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFlow(flow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {error && (
                  <div className="flex items-center gap-1.5 px-2 text-[10px] text-destructive">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            );
          })}

          {flows.length === 0 && (
            <div className="rounded border border-dashed p-2 text-center text-xs italic text-muted-foreground">
              No flows defined.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
