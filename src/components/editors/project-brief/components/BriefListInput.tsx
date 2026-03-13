"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";

interface BriefListInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  onSuggest?: () => Promise<string[]>;
}

export function BriefListInput({
  label,
  items,
  onChange,
  placeholder,
  icon,
  onSuggest,
}: BriefListInputProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);

  const add = () => onChange([...items, ""]);
  const update = (i: number, val: string) => {
    const arr = [...items];
    arr[i] = val;
    onChange(arr);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const handleSuggest = async () => {
    if (!onSuggest) return;
    setIsSuggesting(true);
    try {
      const suggestions = await onSuggest();
      const newItems = suggestions.filter((s) => !items.includes(s));
      onChange([...items, ...newItems]);
    } catch {
      // silently fail — user can retry
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground/60">
          {icon}
          <Label className="text-[10px] font-bold uppercase tracking-widest">{label}</Label>
        </div>
        <div className="flex items-center gap-1">
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
          <Button
            size="sm"
            variant="ghost"
            onClick={add}
            className="h-8 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all px-4"
          >
            <Plus className="h-3 w-3 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="group flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-[10px] font-black text-muted-foreground/20 w-4">{i + 1}</span>
            <Input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="h-11 bg-background/50 border-border/40 rounded-xl hover:bg-background transition-all text-sm shadow-none focus:border-primary/30"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 opacity-0 group-hover:opacity-100 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-8 border border-dashed border-border/60 rounded-[2rem] bg-muted/5 flex flex-col items-center">
            <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
              List is empty
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
