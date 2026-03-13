"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Loader2,
  Sparkles,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ProjectBriefFields } from "@/components/editors/ProjectBriefEditor";

type ImportMode = "paste" | "upload";

function ExtractedPreview({
  fields,
  onApply,
  onReset,
}: {
  fields: ProjectBriefFields;
  onApply: () => void;
  onReset: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Project Name", value: fields.name || "—" },
    { label: "Background", value: fields.background || "—" },
    {
      label: "Objectives",
      value: fields.objectives?.length
        ? `${fields.objectives.length} items`
        : "—",
    },
    {
      label: "Target Users",
      value: fields.target_users?.length
        ? fields.target_users.join(", ")
        : "—",
    },
    {
      label: "Scope In",
      value: fields.scope_in?.length ? `${fields.scope_in.length} items` : "—",
    },
    {
      label: "Scope Out",
      value: fields.scope_out?.length
        ? `${fields.scope_out.length} items`
        : "—",
    },
    {
      label: "Success Metrics",
      value: fields.success_metrics?.length
        ? `${fields.success_metrics.length} metrics`
        : "—",
    },
    {
      label: "Tech Stack",
      value: fields.tech_stack?.length ? fields.tech_stack.join(", ") : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">Extraction complete — review and apply</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20 divide-y divide-border/40 overflow-hidden">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-4 px-4 py-2.5">
            <span className="w-32 shrink-0 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider pt-0.5">
              {row.label}
            </span>
            <span className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60">
        Applying will replace all current Brief fields. You can edit them after.
      </p>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onApply}>
          Apply to Brief
        </Button>
        <Button variant="outline" onClick={onReset}>
          Start over
        </Button>
      </div>
    </div>
  );
}

export function ImportDocumentDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (fields: ProjectBriefFields) => void;
}) {
  const [mode, setMode] = useState<ImportMode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extracted, setExtracted] = useState<ProjectBriefFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const reset = () => {
    setPasteText("");
    setExtracted(null);
    setError(null);
    setFileName(null);
    setIsLoading(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const extract = async (text?: string, fileBase64?: string, mimeType?: string) => {
    setIsLoading(true);
    setError(null);
    setExtracted(null);
    try {
      const res = await fetch("/api/ai/import-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fileBase64, mimeType }),
      });
      const data = (await res.json()) as { fields?: ProjectBriefFields; error?: string };
      if (!res.ok || !data.fields) throw new Error(data.error ?? "Unknown error");
      setExtracted(data.fields);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract document");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteExtract = () => {
    if (pasteText.trim()) void extract(pasteText);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        void extract(undefined, base64, file.type);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  const handleApply = () => {
    if (extracted) {
      onImport(extracted);
      handleClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="px-6 py-5 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Import from document</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Paste or upload a BQ, SOW, or proposal — Claude/Gemini will fill your brief.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {!extracted ? (
            <>
              {/* Mode toggle */}
              <div className="flex rounded-xl bg-muted/40 p-1 gap-1">
                {(["paste", "upload"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                      mode === m
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "paste" ? (
                      <><FileText className="h-3.5 w-3.5" /> Paste text</>
                    ) : (
                      <><Upload className="h-3.5 w-3.5" /> Upload file</>
                    )}
                  </button>
                ))}
              </div>

              {mode === "paste" && (
                <div className="space-y-3">
                  <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your BQ, quotation, SOW, or any project document here..."
                    className="min-h-[200px] text-sm resize-none rounded-2xl"
                    disabled={isLoading}
                  />
                  <Button
                    className="w-full"
                    onClick={handlePasteExtract}
                    disabled={!pasteText.trim() || isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Extracting…</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Extract Brief</>
                    )}
                  </Button>
                </div>
              )}

              {mode === "upload" && (
                <div className="space-y-3">
                  <div
                    {...getRootProps()}
                    className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all ${
                      isDragActive
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/20"
                    } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input {...getInputProps()} />
                    {isLoading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                        <p className="text-sm text-muted-foreground">
                          Extracting from <span className="font-medium">{fileName}</span>…
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground/40" />
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground/70">
                            {isDragActive ? "Drop it here" : "Drop file or click to browse"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground/50">
                            PDF, TXT, or MD — max 10MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </>
          ) : (
            <ExtractedPreview
              fields={extracted}
              onApply={handleApply}
              onReset={reset}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
