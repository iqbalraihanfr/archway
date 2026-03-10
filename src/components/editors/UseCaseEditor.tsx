/* eslint-disable @typescript-eslint/no-explicit-any */
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { EditorProps } from "./ProjectBriefEditor";
import { useBriefFields } from "@/lib/hooks";

// Helper to fetch User Stories for cross-reference
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

function useUserStories(projectId?: string) {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];
      const node = await db.nodes
        .where({ project_id: projectId, type: "user_stories" })
        .first();
      if (!node) return [];
      const content = await db.nodeContents.where({ node_id: node.id }).first();
      return content?.structured_fields?.items || [];
    },
    [projectId],
    [],
  );
}

export function UseCaseEditor({ fields, onChange, projectId }: EditorProps) {
  const briefFields = useBriefFields(projectId);
  const userStories = useUserStories(projectId);

  const targetUsers: string[] = Array.isArray(briefFields?.target_users)
    ? (briefFields.target_users as string[])
    : [];
  const actors: string[] = Array.isArray(fields.actors)
    ? (fields.actors as string[])
    : [];
  const useCases: any[] = Array.isArray(fields.useCases)
    ? (fields.useCases as any[])
    : [];

  const updateActors = (newActors: string[]) =>
    onChange({ ...fields, actors: newActors });
  const updateUseCases = (newUseCases: any[]) =>
    onChange({ ...fields, useCases: newUseCases });

  // Actor CRUD
  const addActor = () => updateActors([...actors, ""]);
  const updateActor = (index: number, val: string) => {
    const arr = [...actors];
    arr[index] = val;
    updateActors(arr);
  };
  const removeActor = (index: number) =>
    updateActors(actors.filter((_, i: number) => i !== index));

  // Use Case CRUD
  const addUseCase = () => {
    updateUseCases([
      ...useCases,
      {
        id: crypto.randomUUID(),
        name: "",
        primary_actor: "",
        secondary_actors: [],
        description: "",
        preconditions: [],
        postconditions: [],
        main_flow: [],
        alternative_flows: [],
        related_user_stories: [],
        include_extend: [],
      },
    ]);
  };
  const updateUseCase = (id: string, updates: any) => {
    updateUseCases(
      useCases.map((uc: any) => (uc.id === id ? { ...uc, ...updates } : uc)),
    );
  };
  const removeUseCase = (id: string) => {
    updateUseCases(useCases.filter((uc: any) => uc.id !== id));
  };

  // UC display ID
  const getUcDisplayId = (idx: number) =>
    `UC-${String(idx + 1).padStart(3, "0")}`;
  // US display ID
  const getUsDisplayId = (idx: number) =>
    `US-${String(idx + 1).padStart(3, "0")}`;

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto w-full h-full">
      {/* Actors Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Actors</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={addActor}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Actor
          </Button>
        </div>
        {targetUsers.length > 0 && actors.length === 0 && (
          <div className="text-xs text-muted-foreground p-2 border border-dashed rounded bg-muted/30">
            Tip: Your Brief has target users: {targetUsers.join(", ")}. Add them
            as actors.
          </div>
        )}
        <div className="space-y-2">
          {actors.map((actor: string, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 border rounded-md bg-background"
            >
              {targetUsers.length > 0 ? (
                <Select
                  value={actor || ""}
                  onValueChange={(val: string | null) =>
                    updateActor(i, val === "__custom__" || !val ? "" : val)
                  }
                >
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue placeholder="Select actor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {targetUsers.map((u, idx) => (
                      <SelectItem key={idx} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={actor}
                  onChange={(e) => updateActor(i, e.target.value)}
                  placeholder="Actor name"
                  className="h-8 text-sm"
                />
              )}
              {!targetUsers.includes(actor) && targetUsers.length > 0 && (
                <Input
                  value={actor}
                  onChange={(e) => updateActor(i, e.target.value)}
                  placeholder="Custom actor..."
                  className="h-8 text-sm"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeActor(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {actors.length === 0 && (
            <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">
              No actors defined.
            </div>
          )}
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Use Cases</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={addUseCase}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Use Case
          </Button>
        </div>
        <div className="space-y-6">
          {useCases.map((uc: any, ucIdx: number) => (
            <div
              key={uc.id}
              className="flex flex-col gap-3 p-4 border rounded-md bg-background relative shadow-sm"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {getUcDisplayId(ucIdx)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeUseCase(uc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Name (verb+object) */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Name (verb + object){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={uc.name || ""}
                  onChange={(e) =>
                    updateUseCase(uc.id, { name: e.target.value.slice(0, 100) })
                  }
                  placeholder="e.g. Checkout Cart"
                  className="h-8 text-sm"
                  maxLength={100}
                />
              </div>

              {/* Primary Actor */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Primary Actor <span className="text-destructive">*</span>
                </Label>
                <select
                  value={uc.primary_actor || ""}
                  onChange={(e) =>
                    updateUseCase(uc.id, { primary_actor: e.target.value })
                  }
                  className="h-8 text-sm border rounded bg-background px-2"
                >
                  <option value="">Select an Actor...</option>
                  {actors.filter(Boolean).map((act: string, idx: number) => (
                    <option key={idx} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              {/* Secondary Actors */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Secondary Actors
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {actors
                    .filter(Boolean)
                    .filter((a: string) => a !== uc.primary_actor)
                    .map((act: string, idx: number) => {
                      const selected = (uc.secondary_actors || []).includes(
                        act,
                      );
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const curr = uc.secondary_actors || [];
                            const updated = selected
                              ? curr.filter((a: string) => a !== act)
                              : [...curr, act];
                            updateUseCase(uc.id, { secondary_actors: updated });
                          }}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${selected ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-transparent hover:border-primary/20"}`}
                        >
                          {act}
                        </button>
                      );
                    })}
                  {actors
                    .filter(Boolean)
                    .filter((a: string) => a !== uc.primary_actor).length ===
                    0 && (
                    <span className="text-[10px] text-muted-foreground italic">
                      No other actors available
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={uc.description || ""}
                  onChange={(e) =>
                    updateUseCase(uc.id, {
                      description: e.target.value.slice(0, 200),
                    })
                  }
                  placeholder="Details..."
                  className="min-h-12.5 text-sm"
                  maxLength={200}
                />
              </div>

              {/* Preconditions */}
              <ListSection
                label="Preconditions"
                items={uc.preconditions || []}
                onChange={(items) =>
                  updateUseCase(uc.id, { preconditions: items })
                }
                placeholder="Precondition..."
                required
              />

              {/* Postconditions (Success) */}
              <ListSection
                label="Postconditions (Success)"
                items={uc.postconditions || []}
                onChange={(items) =>
                  updateUseCase(uc.id, { postconditions: items })
                }
                placeholder="Expected outcome..."
                required
              />

              {/* Main Flow */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase">
                    Main Flow <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] font-normal normal-case">
                      (min 3 steps)
                    </span>
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const flow = uc.main_flow || [];
                      updateUseCase(uc.id, {
                        main_flow: [...flow, { actor: "", action: "" }],
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Step
                  </Button>
                </div>
                <div className="space-y-2">
                  {(uc.main_flow || []).map((step: any, stepIdx: number) => (
                    <div
                      key={stepIdx}
                      className="flex items-start gap-2 p-2 border rounded bg-muted/30"
                    >
                      <span className="text-[10px] font-mono text-muted-foreground mt-2 w-5 text-center shrink-0">
                        {stepIdx + 1}.
                      </span>
                      <div className="flex-1 grid grid-cols-[100px_1fr] gap-2">
                        <select
                          value={step.actor || ""}
                          onChange={(e) => {
                            const flow = [...(uc.main_flow || [])];
                            flow[stepIdx] = {
                              ...flow[stepIdx],
                              actor: e.target.value,
                            };
                            updateUseCase(uc.id, { main_flow: flow });
                          }}
                          className="h-7 text-xs border rounded bg-background px-1"
                        >
                          <option value="">Actor</option>
                          {[
                            uc.primary_actor,
                            ...(uc.secondary_actors || []),
                            "System",
                          ]
                            .filter(Boolean)
                            .map((a: string, i: number) => (
                              <option key={i} value={a}>
                                {a}
                              </option>
                            ))}
                        </select>
                        <Input
                          value={step.action || ""}
                          onChange={(e) => {
                            const flow = [...(uc.main_flow || [])];
                            flow[stepIdx] = {
                              ...flow[stepIdx],
                              action: e.target.value,
                            };
                            updateUseCase(uc.id, { main_flow: flow });
                          }}
                          placeholder="Action..."
                          className="h-7 text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => {
                          const flow = (uc.main_flow || []).filter(
                            (_: any, i: number) => i !== stepIdx,
                          );
                          updateUseCase(uc.id, { main_flow: flow });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {(uc.main_flow || []).length === 0 && (
                    <div className="text-[10px] text-muted-foreground italic p-2 border border-dashed rounded text-center">
                      No steps. (min 3 required)
                    </div>
                  )}
                </div>
              </div>

              {/* Alternative Flows */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase">
                    Alternative Flows
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const alt = uc.alternative_flows || [];
                      updateUseCase(uc.id, {
                        alternative_flows: [
                          ...alt,
                          { name: "", branch_from_step: "", steps: "" },
                        ],
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {(uc.alternative_flows || []).map(
                    (af: any, afIdx: number) => (
                      <div
                        key={afIdx}
                        className="p-2 border rounded bg-muted/30 space-y-2 relative"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={af.name || ""}
                            onChange={(e) => {
                              const alt = [...(uc.alternative_flows || [])];
                              alt[afIdx] = {
                                ...alt[afIdx],
                                name: e.target.value,
                              };
                              updateUseCase(uc.id, { alternative_flows: alt });
                            }}
                            placeholder="Flow name (e.g. Invalid password)"
                            className="h-7 text-xs flex-1"
                          />
                          <Input
                            value={af.branch_from_step || ""}
                            onChange={(e) => {
                              const alt = [...(uc.alternative_flows || [])];
                              alt[afIdx] = {
                                ...alt[afIdx],
                                branch_from_step: e.target.value,
                              };
                              updateUseCase(uc.id, { alternative_flows: alt });
                            }}
                            placeholder="From step #"
                            className="h-7 text-xs w-20"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => {
                              const alt = (uc.alternative_flows || []).filter(
                                (_: any, i: number) => i !== afIdx,
                              );
                              updateUseCase(uc.id, { alternative_flows: alt });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <Textarea
                          value={af.steps || ""}
                          onChange={(e) => {
                            const alt = [...(uc.alternative_flows || [])];
                            alt[afIdx] = {
                              ...alt[afIdx],
                              steps: e.target.value,
                            };
                            updateUseCase(uc.id, { alternative_flows: alt });
                          }}
                          placeholder="Describe alternative steps..."
                          className="min-h-10 text-xs"
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Related User Stories */}
              <div className="grid gap-2 border-t pt-3">
                <Label className="text-xs text-muted-foreground font-semibold uppercase">
                  Related User Stories{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {userStories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {userStories.map((us: any, usIdx: number) => {
                      if (!us.goal) return null;
                      const selected = (uc.related_user_stories || []).includes(
                        us.id,
                      );
                      return (
                        <button
                          key={us.id}
                          type="button"
                          onClick={() => {
                            const curr = uc.related_user_stories || [];
                            const updated = selected
                              ? curr.filter((id: string) => id !== us.id)
                              : [...curr, us.id];
                            updateUseCase(uc.id, {
                              related_user_stories: updated,
                            });
                          }}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${selected ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-transparent hover:border-primary/20"}`}
                        >
                          {getUsDisplayId(usIdx)}:{" "}
                          {(us.goal || "").slice(0, 30)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic p-2 border border-dashed rounded">
                    No user stories defined yet.
                  </p>
                )}
              </div>

              {/* Include/Extend Relationships */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase">
                    Include / Extend
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const ie = uc.include_extend || [];
                      updateUseCase(uc.id, {
                        include_extend: [
                          ...ie,
                          { type: "include", target_uc: "" },
                        ],
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {(uc.include_extend || []).map((rel: any, relIdx: number) => (
                    <div key={relIdx} className="flex items-center gap-2">
                      <select
                        value={rel.type || "include"}
                        onChange={(e) => {
                          const ie = [...(uc.include_extend || [])];
                          ie[relIdx] = { ...ie[relIdx], type: e.target.value };
                          updateUseCase(uc.id, { include_extend: ie });
                        }}
                        className="h-7 text-xs border rounded bg-background px-1 w-24"
                      >
                        <option value="include">Include</option>
                        <option value="extend">Extend</option>
                      </select>
                      <select
                        value={rel.target_uc || ""}
                        onChange={(e) => {
                          const ie = [...(uc.include_extend || [])];
                          ie[relIdx] = {
                            ...ie[relIdx],
                            target_uc: e.target.value,
                          };
                          updateUseCase(uc.id, { include_extend: ie });
                        }}
                        className="h-7 text-xs border rounded bg-background px-1 flex-1"
                      >
                        <option value="">Select UC...</option>
                        {useCases
                          .filter((other: any) => other.id !== uc.id)
                          .map((other: any) => {
                            const globalIdx = useCases.findIndex(
                              (u: any) => u.id === other.id,
                            );
                            return (
                              <option key={other.id} value={other.id}>
                                {getUcDisplayId(globalIdx)}:{" "}
                                {other.name || "Untitled"}
                              </option>
                            );
                          })}
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => {
                          const ie = (uc.include_extend || []).filter(
                            (_: any, i: number) => i !== relIdx,
                          );
                          updateUseCase(uc.id, { include_extend: ie });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {useCases.length === 0 && (
            <div className="text-xs text-muted-foreground italic p-4 border-2 border-dashed rounded-lg text-center">
              No use cases defined. Click Add Use Case.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline list section component for preconditions/postconditions
function ListSection({
  label,
  items,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-semibold uppercase">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs px-2"
          onClick={() => onChange([...items, ""])}
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const arr = [...items];
                arr[i] = e.target.value;
                onChange(arr);
              }}
              placeholder={placeholder}
              className="h-7 text-xs flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-[10px] text-muted-foreground italic p-2 border border-dashed rounded text-center">
            None added.{required ? " (min 1 required)" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
