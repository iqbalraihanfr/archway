import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { EditorProps } from './ProjectBriefEditor';

const DATA_TYPES = ['uuid', 'string', 'integer', 'bigint', 'float', 'decimal', 'boolean', 'text', 'date', 'datetime', 'timestamp', 'json', 'jsonb', 'blob', 'enum'];

export function ERDEditor({ fields, onChange }: EditorProps) {
  const entities = fields.entities || [];
  const relationships = fields.relationships || [];

  const updateEntities = (newE: any[]) => onChange({ ...fields, entities: newE });
  const updateRels = (newR: any[]) => onChange({ ...fields, relationships: newR });

  // Entity CRUD
  const addEntity = () => updateEntities([...entities, { id: crypto.randomUUID(), name: '', description: '', attributes: [] }]);
  const updateEntity = (id: string, updates: any) => updateEntities(entities.map((e: any) => e.id === id ? { ...e, ...updates } : e));
  const removeEntity = (id: string) => updateEntities(entities.filter((e: any) => e.id !== id));

  // Attribute CRUD
  const addAttribute = (entityId: string) => {
    const e = entities.find((e: any) => e.id === entityId);
    if (!e) return;
    const attrs = e.attributes || [];
    updateEntity(entityId, { attributes: [...attrs, { name: '', type: 'string', description: '', isPrimaryKey: false, isForeignKey: false, isUnique: false, isNullable: true, isRequired: false, isIndex: false }] });
  };
  const updateAttribute = (entityId: string, idx: number, updates: any) => {
    const e = entities.find((e: any) => e.id === entityId);
    if (!e) return;
    const attrs = [...(e.attributes || [])];
    attrs[idx] = { ...attrs[idx], ...updates };
    updateEntity(entityId, { attributes: attrs });
  };
  const removeAttribute = (entityId: string, idx: number) => {
    const e = entities.find((e: any) => e.id === entityId);
    if (!e) return;
    const attrs = (e.attributes || []).filter((_: any, i: number) => i !== idx);
    updateEntity(entityId, { attributes: attrs });
  };

  // Relationship CRUD
  const addRel = () => updateRels([...relationships, { id: crypto.randomUUID(), from: '', to: '', type: 'one-to-many', label: '' }]);
  const updateRel = (id: string, updates: any) => updateRels(relationships.map((r: any) => r.id === id ? { ...r, ...updates } : r));
  const removeRel = (id: string) => updateRels(relationships.filter((r: any) => r.id !== id));

  // Enforce entity name UPPERCASE, attribute name snake_case
  const formatEntityName = (val: string) => val.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
  const formatAttrName = (val: string) => val.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto w-full h-full">
      {/* Entities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Entities</Label>
          <Button size="sm" variant="outline" onClick={addEntity} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Entity
          </Button>
        </div>
        <div className="space-y-4">
          {entities.map((ent: any) => (
            <div key={ent.id} className="flex flex-col gap-3 p-3 border rounded-md bg-background relative shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase font-semibold">Entity</Label>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeEntity(ent.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Name (UPPERCASE enforced) */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Name (UPPERCASE) <span className="text-destructive">*</span></Label>
                <Input value={ent.name || ''} onChange={(e) => updateEntity(ent.id, { name: formatEntityName(e.target.value) })} placeholder="e.g. USERS" className="h-8 text-sm font-mono uppercase" />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input value={ent.description || ''} onChange={(e) => updateEntity(ent.id, { description: e.target.value })} placeholder="What this entity represents..." className="h-8 text-sm" />
              </div>

              {/* Attributes */}
              <div className="mt-2 space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Attributes</Label>
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => addAttribute(ent.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {(ent.attributes || []).map((attr: any, idx: number) => (
                    <div key={idx} className="p-2 border rounded bg-muted/30 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Name (snake_case) */}
                        <Input value={attr.name} onChange={e => updateAttribute(ent.id, idx, { name: formatAttrName(e.target.value) })} placeholder="column_name" className="h-7 text-xs flex-1 font-mono" />
                        {/* Type dropdown */}
                        <select value={attr.type || 'string'} onChange={e => updateAttribute(ent.id, idx, { type: e.target.value })} className="h-7 text-xs border rounded bg-background px-1 w-24">
                          {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeAttribute(ent.id, idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* Constraints row */}
                      <div className="flex flex-wrap gap-3 text-[10px]">
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={attr.isPrimaryKey || false} onChange={e => updateAttribute(ent.id, idx, { isPrimaryKey: e.target.checked })} /> PK</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={attr.isForeignKey || false} onChange={e => updateAttribute(ent.id, idx, { isForeignKey: e.target.checked })} /> FK</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={attr.isUnique || false} onChange={e => updateAttribute(ent.id, idx, { isUnique: e.target.checked })} /> Unique</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={attr.isNullable ?? true} onChange={e => updateAttribute(ent.id, idx, { isNullable: e.target.checked })} /> Nullable</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={attr.isRequired || false} onChange={e => updateAttribute(ent.id, idx, { isRequired: e.target.checked })} /> Required</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={attr.isIndex || false} onChange={e => updateAttribute(ent.id, idx, { isIndex: e.target.checked })} /> Index</label>
                      </div>
                      {/* Description */}
                      <Input value={attr.description || ''} onChange={e => updateAttribute(ent.id, idx, { description: e.target.value })} placeholder="Attribute description (optional)" className="h-6 text-[10px]" />
                    </div>
                  ))}
                  {!(ent.attributes?.length) && <div className="text-[10px] text-muted-foreground italic pl-2">No attributes.</div>}
                </div>
              </div>
            </div>
          ))}
          {entities.length === 0 && <div className="text-xs text-muted-foreground italic p-4 border-2 border-dashed rounded-lg text-center">No entities defined.</div>}
        </div>
      </div>

      {/* Relationships */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Relationships</Label>
          <Button size="sm" variant="outline" onClick={addRel} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Rel
          </Button>
        </div>
        <div className="space-y-3">
          {relationships.map((rel: any) => (
            <div key={rel.id} className="p-3 border rounded-md bg-background shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <select value={rel.from} onChange={e => updateRel(rel.id, { from: e.target.value })} className="h-8 text-xs border rounded bg-background px-1 flex-1 truncate">
                  <option value="">Entity A</option>
                  {entities.map((e: any) => <option key={e.id} value={e.name}>{e.name || 'Unnamed'}</option>)}
                </select>
                <select value={rel.type} onChange={e => updateRel(rel.id, { type: e.target.value })} className="h-8 text-xs border rounded bg-background px-1 w-28">
                  <option value="one-to-one">1:1</option>
                  <option value="one-to-many">1:N</option>
                  <option value="many-to-one">N:1</option>
                  <option value="many-to-many">N:M</option>
                </select>
                <select value={rel.to} onChange={e => updateRel(rel.id, { to: e.target.value })} className="h-8 text-xs border rounded bg-background px-1 flex-1 truncate">
                  <option value="">Entity B</option>
                  {entities.map((e: any) => <option key={e.id} value={e.name}>{e.name || 'Unnamed'}</option>)}
                </select>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeRel(rel.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {/* Label (verb) */}
              <Input value={rel.label || ''} onChange={e => updateRel(rel.id, { label: e.target.value })} placeholder="Relationship verb (e.g. places, contains, belongs_to)" className="h-7 text-xs" />
              {/* N:M junction auto-suggest */}
              {rel.type === 'many-to-many' && rel.from && rel.to && (
                <div className="flex items-center gap-2 text-xs p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                  <span>N:M detected. Suggested junction table: <strong>{rel.junction_table || `${rel.from}_${rel.to}`}</strong></span>
                  <Input
                    value={rel.junction_table || `${rel.from}_${rel.to}`}
                    onChange={e => updateRel(rel.id, { junction_table: e.target.value })}
                    className="h-6 text-[10px] font-mono w-40 ml-auto"
                    placeholder="Junction table name"
                  />
                </div>
              )}
            </div>
          ))}
          {relationships.length === 0 && <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">No relationships defined.</div>}
        </div>
      </div>
    </div>
  );
}
