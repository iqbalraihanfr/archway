"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Loader2 } from "lucide-react";

interface BriefTagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  onSuggest?: () => Promise<string[]>;
}

export function BriefTagInput({
  label,
  tags,
  onChange,
  placeholder,
  icon,
  onSuggest,
}: BriefTagInputProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggest = async () => {
    if (!onSuggest) return;
    setIsSuggesting(true);
    try {
      const suggestions = await onSuggest();
      onChange([...tags, ...suggestions.filter((s) => !tags.includes(s))]);
    } catch {
      // silently fail
    } finally {
      setIsSuggesting(false);
    }
  };

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground/60">
          {icon}
          <Label className="text-[10px] font-bold uppercase tracking-widest">{label}</Label>
        </div>
        {onSuggest && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleSuggest()}
            disabled={isSuggesting}
            className="h-8 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all px-4"
          >
            {isSuggesting ? (
              <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Thinking…</>
            ) : (
              <><Sparkles className="h-3 w-3 mr-2" /> Suggest</>
            )}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5 p-4 border border-border/40 rounded-[2rem] bg-background/50 backdrop-blur-sm min-h-[60px] items-center transition-all hover:bg-background/80 hover:border-border/60">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20 shadow-sm animate-in zoom-in-95 duration-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(i)}
              className="hover:scale-125 transition-transform"
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
          className="flex-1 min-w-[150px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 font-medium"
        />
      </div>
      <div className="flex justify-end">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
          Enter or comma to commit
        </p>
      </div>
    </div>
  );
}
