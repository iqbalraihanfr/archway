"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Target,
  Users,
  Maximize,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Link2,
  Trophy,
  History,
  Upload,
} from "lucide-react";
import { useProjectBriefLogic } from "./project-brief/hooks/useProjectBriefLogic";
import { BriefSection } from "./project-brief/components/BriefSection";
import { BriefListInput } from "./project-brief/components/BriefListInput";
import { BriefTagInput } from "./project-brief/components/BriefTagInput";
import { BriefMetricInput } from "./project-brief/components/BriefMetricInput";
import { BriefReferenceInput } from "./project-brief/components/BriefReferenceInput";
import { ImportDocumentDialog } from "./project-brief/components/ImportDocumentDialog";

export interface ProjectBriefFields {
  name?: string;
  background?: string;
  objectives?: string[];
  target_users?: string[];
  scope_in?: string[];
  scope_out?: string[];
  success_metrics?: { metric: string; target: string }[];
  constraints?: string[];
  tech_stack?: string[];
  references?: { name: string; url: string }[];
}

export interface EditorProps {
  fields: ProjectBriefFields;
  onChange: (fields: ProjectBriefFields) => void;
}

async function fetchSuggestions(
  section: string,
  context: ProjectBriefFields
): Promise<string[]> {
  const res = await fetch("/api/ai/assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, context }),
  });
  const data = (await res.json()) as { suggestions?: string[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to generate suggestions");
  return data.suggestions ?? [];
}

export function ProjectBriefEditor({ fields, onChange }: EditorProps) {
  const { updateField } = useProjectBriefLogic(fields, onChange);
  const [importOpen, setImportOpen] = useState(false);

  const suggest = (section: string) => () =>
    fetchSuggestions(section, fields);

  const handleImport = (extracted: ProjectBriefFields) => {
    onChange({ ...fields, ...extracted });
  };

  return (
    <div className="flex-1 overflow-y-auto workspace-scroll">
      <div className="max-w-5xl mx-auto p-5 lg:p-6 space-y-10 pb-16">

        {/* Header Section */}
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary/60">
                <History className="h-3 w-3" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Project Foundation</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="h-7 gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border-border/50 px-3 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
              >
                <Upload className="h-3 w-3" />
                Import Document
              </Button>
            </div>
            <Input
              value={fields.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="PROJECT TITLE"
              className="h-auto p-0 border-none bg-transparent text-2xl lg:text-3xl font-black uppercase tracking-tighter placeholder:text-muted-foreground/15 focus-visible:ring-0 shadow-none"
            />
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
            <Textarea
              value={fields.background || ""}
              onChange={(e) => updateField("background", e.target.value)}
              placeholder="Why does this project exist? What terminal problem are we solving?"
              className="min-h-[80px] text-base font-medium leading-relaxed bg-transparent border-none p-0 focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/20 italic"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-20">

          {/* Strategic Context */}
          <BriefSection title="Strategic Context">
            <BriefListInput
              label="Key Objectives"
              items={fields.objectives || []}
              onChange={(val) => updateField("objectives", val)}
              placeholder="Achieve 99.9% uptime..."
              icon={<Target className="h-3 w-3" />}
              onSuggest={suggest("objectives")}
            />
            <BriefTagInput
              label="Target Audience"
              tags={fields.target_users || []}
              onChange={(val) => updateField("target_users", val)}
              placeholder="Enterprise Admins, End Users..."
              icon={<Users className="h-3 w-3" />}
              onSuggest={suggest("target_users")}
            />
          </BriefSection>

          {/* Boundaries */}
          <BriefSection title="Boundaries & Limits">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <BriefListInput
                label="Scope (IN)"
                items={fields.scope_in || []}
                onChange={(val) => updateField("scope_in", val)}
                placeholder="Core API development..."
                icon={<CheckCircle2 className="h-3 w-3 text-emerald-500/60" />}
                onSuggest={suggest("scope_in")}
              />
              <BriefListInput
                label="Scope (OUT)"
                items={fields.scope_out || []}
                onChange={(val) => updateField("scope_out", val)}
                placeholder="Third-party integrations..."
                icon={<AlertCircle className="h-3 w-3 text-rose-500/60" />}
                onSuggest={suggest("scope_out")}
              />
            </div>
            <BriefListInput
              label="Constraints"
              items={fields.constraints || []}
              onChange={(val) => updateField("constraints", val)}
              placeholder="Fixed deadline, legacy DB..."
              icon={<Maximize className="h-3 w-3" />}
              onSuggest={suggest("constraints")}
            />
          </BriefSection>

          {/* Technical Alignment */}
          <BriefSection title="Technical Alignment">
            <BriefTagInput
              label="Technology Stack"
              tags={fields.tech_stack || []}
              onChange={(val) => updateField("tech_stack", val)}
              placeholder="Next.js, Prisma, Tailwind..."
              icon={<Cpu className="h-3 w-3" />}
              onSuggest={suggest("tech_stack")}
            />
            <BriefMetricInput
              label="Success Metrics"
              items={fields.success_metrics || []}
              onChange={(val) => updateField("success_metrics", val)}
              icon={<Trophy className="h-3 w-3" />}
            />
          </BriefSection>

          {/* External Links */}
          <BriefSection title="Supporting Knowledge">
            <BriefReferenceInput
              label="References & Assets"
              items={fields.references || []}
              onChange={(val) => updateField("references", val)}
              icon={<Link2 className="h-3 w-3" />}
            />
          </BriefSection>

        </div>
      </div>

      <ImportDocumentDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />
    </div>
  );
}
