"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Database, ArrowRightLeft, LayoutGrid, Code2 } from "lucide-react";
import { useERDLogic, ERDFields } from "./erd/hooks/useERDLogic";
import { EntityItem } from "./erd/components/EntityItem";
import { RelationshipItem } from "./erd/components/RelationshipItem";
import { ParseSqlDialog } from "./erd/components/ParseSqlDialog";

export interface EditorProps {
  fields: ERDFields;
  onChange: (fields: ERDFields) => void;
}

export function ERDEditor({ fields, onChange }: EditorProps) {
  const [sqlOpen, setSqlOpen] = useState(false);
  const {
    entities,
    relationships,
    addEntity,
    updateEntity,
    removeEntity,
    addAttribute,
    updateAttribute,
    removeAttribute,
    addRel,
    updateRel,
    removeRel,
  } = useERDLogic(fields, onChange);

  return (
    <div className="flex-1 overflow-y-auto workspace-scroll">
      <div className="max-w-5xl mx-auto p-8 lg:p-12 space-y-24 pb-32">
        
        {/* Header Section */}
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary/60">
              <LayoutGrid className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Database Schema</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSqlOpen(true)}
              className="h-7 gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border-border/50 px-3 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
            >
              <Code2 className="h-3 w-3" />
              Import Schema
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter text-foreground">
              ER DIAGRAM
            </h2>
          </div>
          <p className="text-lg lg:text-xl font-medium leading-relaxed text-muted-foreground/60 max-w-2xl italic">
            Defining the structural blueprint of your data architecture. Establish entities, attributes, and their relational integrity.
          </p>
        </div>

        {/* Entities Section */}
        <section className="space-y-12">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest text-foreground">Entities</h3>
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Foundational data structures</p>
              </div>
            </div>
            <Button
              onClick={addEntity}
              size="sm"
              className="h-10 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Entity
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-10">
            {entities.map((entity) => (
              <EntityItem
                key={entity.id}
                entity={entity}
                onUpdate={(updates) => updateEntity(entity.id, updates)}
                onRemove={() => removeEntity(entity.id)}
                onAddAttribute={() => addAttribute(entity.id)}
                onUpdateAttribute={(idx, updates) => updateAttribute(entity.id, idx, updates)}
                onRemoveAttribute={(idx) => removeAttribute(entity.id, idx)}
              />
            ))}

            {entities.length === 0 && (
              <div className="py-24 border-2 border-dashed border-border/40 rounded-[3rem] bg-muted/5 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                <Database className="h-12 w-12 text-muted-foreground/10 mb-6" />
                <h4 className="text-xl font-black uppercase tracking-widest text-muted-foreground/20">Blueprint Empty</h4>
                <p className="text-sm font-medium text-muted-foreground/30 mt-2">Initialize your data schema by adding entities.</p>
              </div>
            )}
          </div>
        </section>

        {/* Relationships Section */}
        <section className="space-y-12 pt-12">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest text-foreground">Relationships</h3>
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Logical connections between entities</p>
              </div>
            </div>
            <Button
              onClick={addRel}
              size="sm"
              variant="outline"
              className="h-10 rounded-full border-border/60 font-black uppercase tracking-widest px-6 hover:bg-primary/5 hover:text-primary transition-all"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Relationship
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {relationships.map((rel) => (
              <RelationshipItem
                key={rel.id}
                relationship={rel}
                entities={entities}
                onUpdate={(updates) => updateRel(rel.id, updates)}
                onRemove={() => removeRel(rel.id)}
              />
            ))}

            {relationships.length === 0 && (
              <div className="py-16 border border-dashed border-border/40 rounded-[3rem] bg-muted/5 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/20">
                  No defined relationships
                </p>
              </div>
            )}
          </div>
        </section>

      </div>

      <ParseSqlDialog
        open={sqlOpen}
        onOpenChange={setSqlOpen}
        onImport={(parsed) => onChange({ ...fields, ...parsed })}
      />
    </div>
  );
}
