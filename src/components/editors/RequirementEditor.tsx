/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { EditorProps } from "./ProjectBriefEditor";
import { useBriefFields } from "@/lib/hooks";

const FR_CATEGORIES = [
  "Authentication",
  "Authorization",
  "User Management",
  "Data Management",
  "Reporting",
  "Notification",
  "Payment",
  "Integration",
  "Search",
  "File Management",
  "Communication",
  "Settings",
  "Dashboard",
];

const NFR_CATEGORIES = [
  "Performance",
  "Security",
  "Usability",
  "Reliability",
  "Scalability",
  "Compatibility",
];

export function RequirementEditor({
  fields,
  onChange,
  projectId,
}: EditorProps) {
  const [activeTab, setActiveTab] = useState("FR");
  const briefFields = useBriefFields(projectId);

  const items = (fields.items as any[]) || [];
  const activeItems = items.filter((i: any) => (i.type || "FR") === activeTab);

  // Compute auto-IDs for display
  const frItems = items.filter((i: any) => (i.type || "FR") === "FR");
  const nfrItems = items.filter((i: any) => i.type === "NFR");

  const getDisplayId = (item: any) => {
    if ((item.type || "FR") === "FR") {
      const idx = frItems.findIndex((i: any) => i.id === item.id);
      return `FR-${String(idx + 1).padStart(3, "0")}`;
    }
    const idx = nfrItems.findIndex((i: any) => i.id === item.id);
    return `NFR-${String(idx + 1).padStart(3, "0")}`;
  };

  const updateItems = (newItems: any[]) => {
    onChange({ ...fields, items: newItems });
  };

  const addItem = () => {
    const base: any = {
      id: crypto.randomUUID(),
      type: activeTab,
      description: "",
      priority: "Should",
      category: "",
    };
    if (activeTab === "NFR") {
      base.metric = "";
      base.target = "";
    } else {
      base.related_scope = "";
    }
    updateItems([...items, base]);
  };

  const updateItem = (id: string, updates: any) => {
    updateItems(
      items.map((it: any) => (it.id === id ? { ...it, ...updates } : it)),
    );
  };

  const removeItem = (id: string) => {
    updateItems(items.filter((it: any) => it.id !== id));
  };

  const scopeInItems: string[] = briefFields?.scope_in || [];
  const categories = activeTab === "FR" ? FR_CATEGORIES : NFR_CATEGORIES;

  // Validation hints
  const frCount = frItems.length;
  const nfrCount = nfrItems.length;
  const hasMust = items.some((i: any) => i.priority === "Must");

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 border-b shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="FR" className="flex-1 text-xs">
              Functional (FR){" "}
              {frCount > 0 && (
                <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                  {frCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="NFR" className="flex-1 text-xs">
              Non-Functional (NFR){" "}
              {nfrCount > 0 && (
                <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                  {nfrCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Validation hints */}
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          <span className={frCount >= 3 ? "text-green-600" : "text-amber-600"}>
            {frCount >= 3 ? "✓" : "!"} Min 3 FRs ({frCount}/3)
          </span>
          <span className={nfrCount >= 1 ? "text-green-600" : "text-amber-600"}>
            {nfrCount >= 1 ? "✓" : "!"} Min 1 NFR ({nfrCount}/1)
          </span>
          <span className={hasMust ? "text-green-600" : "text-amber-600"}>
            {hasMust ? "✓" : "!"} At least 1 Must priority
          </span>
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between shrink-0 mb-2">
          <Label className="text-sm font-semibold">
            {activeTab === "FR"
              ? "Functional Requirements"
              : "Non-Functional Requirements"}
          </Label>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>

        {activeItems.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm shrink-0">
            No {activeTab} defined yet. Click Add.
          </div>
        )}

        <div className="space-y-4 pb-4">
          {activeItems.map((item: any) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 p-4 border rounded-md bg-background shadow-sm relative"
            >
              {/* Header: Auto-ID + Delete */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {getDisplayId(item)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(item.id, {
                      description: e.target.value.slice(0, 200),
                    })
                  }
                  placeholder="Requirement details..."
                  className="min-h-[60px] resize-none text-sm"
                  maxLength={200}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {(item.description || "").length}/200
                </p>
              </div>

              {/* Category + Priority row */}
              <div className="flex items-end gap-3">
                <div className="grid gap-2 flex-1">
                  <Label className="text-xs text-muted-foreground">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={
                      categories.includes(item.category)
                        ? item.category
                        : "__custom__"
                    }
                    onValueChange={(val) => {
                      if (val !== "__custom__") {
                        updateItem(item.id, { category: val });
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                  {!categories.includes(item.category) && (
                    <Input
                      value={item.category || ""}
                      onChange={(e) =>
                        updateItem(item.id, { category: e.target.value })
                      }
                      placeholder="Custom category..."
                      className="h-8 text-sm"
                    />
                  )}
                </div>
                <div className="grid gap-2 w-[130px] shrink-0">
                  <Label className="text-xs text-muted-foreground">
                    Priority <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={item.priority || "Should"}
                    onValueChange={(val) =>
                      updateItem(item.id, { priority: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Must">Must</SelectItem>
                      <SelectItem value="Should">Should</SelectItem>
                      <SelectItem value="Could">Could</SelectItem>
                      <SelectItem value="Wont">Won&apos;t</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* FR-specific: Related Scope Item */}
              {activeTab === "FR" && scopeInItems.length > 0 && (
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Related Scope Item
                  </Label>
                  <Select
                    value={item.related_scope || ""}
                    onValueChange={(val) =>
                      updateItem(item.id, {
                        related_scope: val === "__none__" ? "" : val,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Link to a scope item..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {scopeInItems
                        .filter(Boolean)
                        .map((scope: string, idx: number) => (
                          <SelectItem key={idx} value={scope}>
                            {scope}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* NFR-specific: Metric + Target */}
              {activeTab === "NFR" && (
                <div className="flex items-end gap-3">
                  <div className="grid gap-2 flex-1">
                    <Label className="text-xs text-muted-foreground">
                      Metric <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={item.metric || ""}
                      onChange={(e) =>
                        updateItem(item.id, { metric: e.target.value })
                      }
                      placeholder="e.g. Response Time"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-2 flex-1">
                    <Label className="text-xs text-muted-foreground">
                      Target <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={item.target || ""}
                      onChange={(e) =>
                        updateItem(item.id, { target: e.target.value })
                      }
                      placeholder="e.g. < 200ms"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
