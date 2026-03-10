import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X } from "lucide-react";

type MetricPair = {
  metric: string;
  target: string;
};

type ReferencePair = {
  name: string;
  url: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface StructuredEditorFields {
  [key: string]: any;
}

export interface ProjectBriefFields extends StructuredEditorFields {
  name?: string;
  background?: string;
  objectives?: string[];
  target_users?: string[];
  scope_in?: string[];
  scope_out?: string[];
  success_metrics?: MetricPair[];
  constraints?: string[];
  tech_stack?: string[];
  references?: ReferencePair[];
}

export interface EditorProps<
  TFields extends StructuredEditorFields = ProjectBriefFields,
> {
  fields: TFields;
  onChange: (fields: TFields) => void;
  projectId?: string;
}

// Reusable list input component (array of strings with add/remove)
function ListInput({
  label,
  items,
  onChange,
  placeholder,
  required,
  minItems,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  required?: boolean;
  minItems?: number;
}) {
  const add = () => onChange([...items, ""]);
  const update = (i: number, val: string) => {
    const arr = [...items];
    arr[i] = val;
    onChange(arr);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <Button
          size="sm"
          variant="outline"
          onClick={add}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="bg-background h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">
            No items added.{minItems ? ` (min ${minItems} required)` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// Tag/chip input component (array of strings, inline add via Enter/comma)
function TagInput({
  label,
  tags,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if ((e.key === "Enter" || e.key === ",") && input.value.trim()) {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, "");
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
      }
      input.value = "";
    }
    if (e.key === "Backspace" && !input.value && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-9.5 items-center">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(i)}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          onKeyDown={handleKeyDown}
          placeholder={
            tags.length === 0
              ? placeholder || "Type and press Enter..."
              : "Add more..."
          }
          className="flex-1 min-w-30 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Press Enter or comma to add
      </p>
    </div>
  );
}

// Metric + target pairs
function MetricPairsInput({
  label,
  pairs,
  onChange,
  required,
}: {
  label: string;
  pairs: MetricPair[];
  onChange: (pairs: MetricPair[]) => void;
  required?: boolean;
}) {
  const add = () => onChange([...pairs, { metric: "", target: "" }]);
  const update = (i: number, key: "metric" | "target", val: string) => {
    const arr = [...pairs];
    arr[i] = { ...arr[i], [key]: val };
    onChange(arr);
  };
  const remove = (i: number) => onChange(pairs.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <Button
          size="sm"
          variant="outline"
          onClick={add}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={pair.metric}
              onChange={(e) => update(i, "metric", e.target.value)}
              placeholder="Metric (e.g. Response Time)"
              className="bg-background h-8 text-sm flex-1"
            />
            <Input
              value={pair.target}
              onChange={(e) => update(i, "target", e.target.value)}
              placeholder="Target (e.g. < 200ms)"
              className="bg-background h-8 text-sm flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {pairs.length === 0 && (
          <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">
            No metrics added.{required ? " (min 1 required)" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// Name + URL pairs for references
function ReferencePairsInput({
  label,
  pairs,
  onChange,
}: {
  label: string;
  pairs: ReferencePair[];
  onChange: (pairs: ReferencePair[]) => void;
}) {
  const add = () => onChange([...pairs, { name: "", url: "" }]);
  const update = (i: number, key: "name" | "url", val: string) => {
    const arr = [...pairs];
    arr[i] = { ...arr[i], [key]: val };
    onChange(arr);
  };
  const remove = (i: number) => onChange(pairs.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={add}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={pair.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Name"
              className="bg-background h-8 text-sm w-[40%]"
            />
            <Input
              value={pair.url}
              onChange={(e) => update(i, "url", e.target.value)}
              placeholder="https://..."
              className="bg-background h-8 text-sm flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {pairs.length === 0 && (
          <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">
            No references added.
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectBriefEditor({
  fields,
  onChange,
}: EditorProps<ProjectBriefFields>) {
  const updateField = <K extends keyof ProjectBriefFields>(
    key: K,
    value: ProjectBriefFields[K],
  ) => {
    onChange({ ...fields, [key]: value });
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full h-full">
      {/* Project Name */}
      <div className="space-y-2">
        <Label>
          Project Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={fields.name || ""}
          onChange={(e) => updateField("name", e.target.value.slice(0, 100))}
          placeholder="e.g. Toko Online"
          className="bg-background"
          maxLength={100}
        />
        <p className="text-[10px] text-muted-foreground text-right">
          {(fields.name || "").length}/100
        </p>
      </div>

      {/* Background / Why */}
      <div className="space-y-2">
        <Label>
          Background / Why <span className="text-destructive">*</span>
        </Label>
        <Textarea
          value={fields.background || ""}
          onChange={(e) =>
            updateField("background", e.target.value.slice(0, 300))
          }
          placeholder="Why does this project exist? What problem does it solve?"
          className="min-h-20 bg-background"
          maxLength={300}
        />
        <p className="text-[10px] text-muted-foreground text-right">
          {(fields.background || "").length}/300
        </p>
      </div>

      {/* Objectives */}
      <ListInput
        label="Objectives"
        items={fields.objectives || []}
        onChange={(items) => updateField("objectives", items)}
        placeholder="Objective..."
        required
        minItems={1}
      />

      {/* Target Users */}
      <TagInput
        label="Target Users"
        tags={fields.target_users || []}
        onChange={(tags) => updateField("target_users", tags)}
        placeholder="e.g. Admin, Customer, Support Staff"
        required
      />

      {/* Scope In */}
      <ListInput
        label="Scope In"
        items={fields.scope_in || []}
        onChange={(items) => updateField("scope_in", items)}
        placeholder="Feature or area that is in scope..."
        required
        minItems={1}
      />

      {/* Scope Out */}
      <ListInput
        label="Scope Out"
        items={fields.scope_out || []}
        onChange={(items) => updateField("scope_out", items)}
        placeholder="Feature or area that is out of scope..."
        required
        minItems={1}
      />

      {/* Success Metrics */}
      <MetricPairsInput
        label="Success Metrics"
        pairs={fields.success_metrics || []}
        onChange={(pairs) => updateField("success_metrics", pairs)}
        required
      />

      {/* Constraints */}
      <ListInput
        label="Constraints"
        items={fields.constraints || []}
        onChange={(items) => updateField("constraints", items)}
        placeholder="Time, budget, or technical constraint..."
      />

      {/* Tech Stack */}
      <TagInput
        label="Tech Stack"
        tags={fields.tech_stack || []}
        onChange={(tags) => updateField("tech_stack", tags)}
        placeholder="e.g. React, Node.js, PostgreSQL"
      />

      {/* References */}
      <ReferencePairsInput
        label="References"
        pairs={fields.references || []}
        onChange={(pairs) => updateField("references", pairs)}
      />
    </div>
  );
}
