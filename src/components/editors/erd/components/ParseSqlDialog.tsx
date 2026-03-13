"use client";

import { useState } from "react";
import {
  Code2,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ERDFields, ERDEntity, ERDRelationship } from "../hooks/useERDLogic";
import { parseSqlToERD } from "@/lib/parseSql";
import { parseDbmlToERD } from "@/lib/parseDbml";

// ── Shared preview component ──────────────────────────────────────────────────

function ExtractedPreview({
  fields,
  onApply,
  onReset,
}: {
  fields: ERDFields;
  onApply: () => void;
  onReset: () => void;
}) {
  const entities = fields.entities ?? [];
  const relationships = fields.relationships ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">
          Parsed {entities.length} entities, {relationships.length} relationships
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden">
        {entities.map((e) => (
          <div key={e.id} className="border-b border-border/40 last:border-0 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                {e.name || "Unnamed"}
              </span>
              <span className="text-xs text-muted-foreground/50">
                {e.attributes.length} attrs
              </span>
            </div>
            {e.attributes.slice(0, 3).map((a, i) => (
              <span key={i} className="mr-2 text-xs text-muted-foreground/60">
                {a.isPrimaryKey ? "🔑 " : a.isForeignKey ? "🔗 " : ""}{a.name}
              </span>
            ))}
            {e.attributes.length > 3 && (
              <span className="text-xs text-muted-foreground/40">
                +{e.attributes.length - 3} more
              </span>
            )}
          </div>
        ))}
        {entities.length === 0 && (
          <div className="px-4 py-3 text-xs text-muted-foreground/50">No entities found</div>
        )}
      </div>

      {relationships.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-muted/20 divide-y divide-border/40 overflow-hidden">
          {relationships.map((r) => (
            <div key={r.id} className="px-4 py-2 text-xs text-muted-foreground/70">
              {r.from} → {r.to}
              <span className="ml-2 text-muted-foreground/40">({r.type})</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground/60">
        Applying will replace current ERD entities and relationships.
      </p>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onApply}>
          Apply to ERD
        </Button>
        <Button variant="outline" onClick={onReset}>
          Start over
        </Button>
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "dbml" | "sql";
type Status = "idle" | "parsing" | "preview" | "error" | "ai-parsing";

const PLACEHOLDERS: Record<Mode, string> = {
  dbml: `Table users {
  id integer [pk, increment]
  email varchar [unique, not null]
  created_at timestamp
}

Table orders {
  id integer [pk]
  user_id integer [ref: > users.id]
  total decimal [not null]
}`,
  sql: `CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL
);`,
};

// ── Main dialog ───────────────────────────────────────────────────────────────

export function ParseSqlDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (fields: ERDFields) => void;
}) {
  const [mode, setMode] = useState<Mode>("dbml");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [extracted, setExtracted] = useState<ERDFields | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showAIConfirm, setShowAIConfirm] = useState(false);

  const reset = () => {
    setInput("");
    setStatus("idle");
    setExtracted(null);
    setParseError(null);
    setShowAIConfirm(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    reset();
  };

  const normalizeFields = (raw: ERDFields): ERDFields => ({
    entities: (raw.entities ?? []).map((e: ERDEntity) => ({
      ...e,
      id: e.id || crypto.randomUUID(),
      attributes: e.attributes ?? [],
    })),
    relationships: (raw.relationships ?? []).map((r: ERDRelationship) => ({
      ...r,
      id: r.id || crypto.randomUUID(),
    })),
  });

  // ── Primary: local parser ─────────────────────────────────────────────────
  const handleParse = () => {
    setStatus("parsing");
    setParseError(null);
    setShowAIConfirm(false);
    setExtracted(null);

    try {
      const fields = mode === "dbml" ? parseDbmlToERD(input) : parseSqlToERD(input);
      if (!fields.entities?.length) {
        setParseError(
          mode === "dbml"
            ? "No Table definitions found in the DBML."
            : "No CREATE TABLE statements found in the SQL."
        );
        setShowAIConfirm(true);
        setStatus("error");
        return;
      }
      setExtracted(normalizeFields(fields));
      setStatus("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not parse input.";
      setParseError(msg);
      setShowAIConfirm(true);
      setStatus("error");
    }
  };

  // ── Fallback: AI (user-confirmed) ─────────────────────────────────────────
  const handleAIFallback = async () => {
    setShowAIConfirm(false);
    setStatus("ai-parsing");
    setParseError(null);

    try {
      const res = await fetch("/api/ai/parse-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: input }),
      });
      const data = (await res.json()) as { fields?: ERDFields; error?: string };
      if (!res.ok || !data.fields) throw new Error(data.error ?? "Unknown error");

      setExtracted(normalizeFields(data.fields));
      setStatus("preview");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "AI parsing failed. Check your API key.");
      setStatus("error");
    }
  };

  const handleApply = () => {
    if (extracted) {
      onImport(extracted);
      handleClose(false);
    }
  };

  const isLoading = status === "parsing" || status === "ai-parsing";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="px-6 py-5 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Code2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Import Schema</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Parsed instantly — no AI required.
              </DialogDescription>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="mt-3 flex gap-1 rounded-xl bg-muted/50 p-1">
            {(["dbml", "sql"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "dbml" ? "DBML" : "SQL"}
              </button>
            ))}
          </div>

          {/* Format hint */}
          <p className="mt-2 text-[11px] text-muted-foreground/60">
            {mode === "dbml"
              ? "DBML format — used by dbdiagram.io and dbdocs.io. Best for new schemas."
              : "SQL CREATE TABLE statements — paste from Supabase, Prisma migrations, or any database."}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {status === "preview" && extracted ? (
            <ExtractedPreview
              fields={extracted}
              onApply={handleApply}
              onReset={reset}
            />
          ) : (
            <>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={PLACEHOLDERS[mode]}
                className="min-h-[240px] font-mono text-xs resize-none rounded-2xl"
                disabled={isLoading}
              />

              <Button
                className="w-full"
                onClick={handleParse}
                disabled={!input.trim() || isLoading}
              >
                {status === "parsing" ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Parsing…</>
                ) : status === "ai-parsing" ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> AI is analyzing…</>
                ) : (
                  <><Code2 className="h-4 w-4 mr-2" /> Parse {mode.toUpperCase()}</>
                )}
              </Button>

              {/* Error state */}
              {status === "error" && parseError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{parseError}</p>
                  </div>

                  {showAIConfirm && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          The local parser couldn&apos;t handle this input. Try with AI? This requires an API key and sends your schema to the AI provider.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                          onClick={() => void handleAIFallback()}
                        >
                          <Sparkles className="h-3 w-3 mr-1.5" />
                          Yes, try AI
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setShowAIConfirm(false)}
                        >
                          No thanks
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
