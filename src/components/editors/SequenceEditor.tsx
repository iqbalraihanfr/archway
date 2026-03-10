/* eslint-disable @typescript-eslint/no-explicit-any */
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { EditorProps } from "./ProjectBriefEditor";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const PARTICIPANT_TYPES = [
  "actor",
  "component",
  "service",
  "database",
  "external",
];
const MESSAGE_TYPES = ["request", "response", "self"];
const GROUP_TYPES = ["none", "alt", "opt", "loop"];

function useUseCases(projectId?: string) {
  return useLiveQuery(
    async () => {
      if (!projectId) return [];
      const node = await db.nodes
        .where({ project_id: projectId, type: "use_cases" })
        .first();
      if (!node) return [];
      const content = await db.nodeContents.where({ node_id: node.id }).first();
      return content?.structured_fields?.useCases || [];
    },
    [projectId],
    [],
  );
}

export function SequenceEditor({ fields, onChange, projectId }: EditorProps) {
  const useCases = useUseCases(projectId);

  const participants = fields.participants || [];
  const messages = fields.messages || [];

  const updateParticipants = (newP: any[]) =>
    onChange({ ...fields, participants: newP });
  const updateMessages = (newM: any[]) =>
    onChange({ ...fields, messages: newM });

  // Migrate old string[] participants to structured
  const getParticipantName = (p: any) =>
    typeof p === "string" ? p : p?.name || "";
  const getParticipantType = (p: any) =>
    typeof p === "string" ? "component" : p?.type || "component";
  const participantNames = participants.map(getParticipantName);

  const addParticipant = () =>
    updateParticipants([
      ...participants,
      { name: "", type: "component", order: participants.length },
    ]);
  const updateParticipant = (index: number, updates: any) => {
    const arr = [...participants];
    const current =
      typeof arr[index] === "string"
        ? { name: arr[index], type: "component", order: index }
        : arr[index];
    arr[index] = { ...current, ...updates };
    updateParticipants(arr);
  };
  const removeParticipant = (index: number) =>
    updateParticipants(participants.filter((_: any, i: number) => i !== index));

  const addMessage = () =>
    updateMessages([
      ...messages,
      {
        id: crypto.randomUUID(),
        from: "",
        to: "",
        content: "",
        type: "request",
        group: "none",
        group_label: "",
      },
    ]);
  const updateMessage = (id: string, updates: any) =>
    updateMessages(
      messages.map((m: any) => (m.id === id ? { ...m, ...updates } : m)),
    );
  const removeMessage = (id: string) =>
    updateMessages(messages.filter((m: any) => m.id !== id));

  // Auto-extract API endpoints
  const apiEndpoints = messages
    .filter((m: any) => {
      const c = (m.content || "").toUpperCase();
      return (
        /^(GET|POST|PUT|PATCH|DELETE)\s/.test(c) ||
        /\/api\//.test(m.content || "")
      );
    })
    .map((m: any) => m.content);

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto w-full h-full">
      {/* Sequence metadata */}
      <div className="space-y-3">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">
            Related Use Case
          </Label>
          <select
            value={fields.related_use_case || ""}
            onChange={(e) =>
              onChange({ ...fields, related_use_case: e.target.value })
            }
            className="h-8 text-xs border rounded bg-background px-2"
          >
            <option value="">Select UC...</option>
            {useCases.map((uc: any, i: number) => (
              <option key={uc.id} value={uc.id}>
                UC-{String(i + 1).padStart(3, "0")}: {uc.name || "Untitled"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Participants</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={addParticipant}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {participants.map((p: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 border rounded-md bg-background"
            >
              <select
                value={getParticipantType(p)}
                onChange={(e) => updateParticipant(i, { type: e.target.value })}
                className="h-8 text-[10px] border rounded bg-background px-1 w-24"
              >
                {PARTICIPANT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Input
                value={getParticipantName(p)}
                onChange={(e) => updateParticipant(i, { name: e.target.value })}
                placeholder="Participant name..."
                className="h-8 text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeParticipant(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {participants.length === 0 && (
            <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">
              No participants.
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Messages</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={addMessage}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {messages.map((m: any, msgIdx: number) => (
            <div
              key={m.id}
              className="flex flex-col gap-2 p-3 border rounded-md bg-background shadow-sm relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">
                  Step {msgIdx + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMessage(m.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {/* From → To */}
              <div className="flex gap-2 items-center">
                <select
                  value={m.from || ""}
                  onChange={(e) =>
                    updateMessage(m.id, { from: e.target.value })
                  }
                  className="h-8 text-xs border rounded bg-background px-1 flex-1"
                >
                  <option value="">From...</option>
                  {participantNames
                    .filter(Boolean)
                    .map((name: string, idx: number) => (
                      <option key={idx} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
                <span className="text-muted-foreground text-xs font-bold px-1">
                  →
                </span>
                <select
                  value={m.to || ""}
                  onChange={(e) => updateMessage(m.id, { to: e.target.value })}
                  className="h-8 text-xs border rounded bg-background px-1 flex-1"
                >
                  <option value="">To...</option>
                  {participantNames
                    .filter(Boolean)
                    .map((name: string, idx: number) => (
                      <option key={idx} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
              </div>
              {/* Content */}
              <Input
                value={m.content || ""}
                onChange={(e) =>
                  updateMessage(m.id, { content: e.target.value })
                }
                placeholder="Message (e.g. POST /api/login)"
                className="h-8 text-sm"
              />
              {/* Type + Group */}
              <div className="flex gap-2">
                <div className="grid gap-1 flex-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Type
                  </Label>
                  <select
                    value={m.type || "request"}
                    onChange={(e) =>
                      updateMessage(m.id, { type: e.target.value })
                    }
                    className="h-7 text-[10px] border rounded bg-background px-1"
                  >
                    {MESSAGE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1 flex-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Group
                  </Label>
                  <select
                    value={m.group || "none"}
                    onChange={(e) =>
                      updateMessage(m.id, { group: e.target.value })
                    }
                    className="h-7 text-[10px] border rounded bg-background px-1"
                  >
                    {GROUP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === "none" ? "— none —" : t}
                      </option>
                    ))}
                  </select>
                </div>
                {m.group && m.group !== "none" && (
                  <div className="grid gap-1 flex-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Group Label
                    </Label>
                    <Input
                      value={m.group_label || ""}
                      onChange={(e) =>
                        updateMessage(m.id, { group_label: e.target.value })
                      }
                      placeholder="e.g. Invalid credentials"
                      className="h-7 text-[10px]"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">
              No messages.
            </div>
          )}
        </div>
      </div>

      {/* Auto-extracted API Endpoints */}
      {apiEndpoints.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs text-muted-foreground font-semibold uppercase">
            Auto-detected API Endpoints
          </Label>
          <div className="space-y-1">
            {apiEndpoints.map((ep: string, i: number) => (
              <div
                key={i}
                className="text-xs font-mono bg-muted/50 px-2 py-1 rounded border"
              >
                {ep}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
