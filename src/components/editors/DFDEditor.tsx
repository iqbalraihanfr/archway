import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { EditorProps } from './ProjectBriefEditor';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

function useUseCases(projectId?: string) {
  return useLiveQuery(async () => {
    if (!projectId) return [];
    const node = await db.nodes.where({ project_id: projectId, type: 'use_cases' }).first();
    if (!node) return [];
    const content = await db.nodeContents.where({ node_id: node.id }).first();
    return content?.structured_fields?.useCases || [];
  }, [projectId], []);
}

function useERDEntities(projectId?: string) {
  return useLiveQuery(async () => {
    if (!projectId) return [];
    const node = await db.nodes.where({ project_id: projectId, type: 'erd' }).first();
    if (!node) return [];
    const content = await db.nodeContents.where({ node_id: node.id }).first();
    return content?.structured_fields?.entities || [];
  }, [projectId], []);
}

// DFD rule validation
function validateDFDFlow(fromNode: any, toNode: any, allNodes: any[]): string | null {
  if (!fromNode || !toNode) return null;
  // EE cannot connect directly to another EE or DS
  if (fromNode.type === 'entity' && (toNode.type === 'entity' || toNode.type === 'datastore')) {
    return `External Entity cannot connect directly to ${toNode.type === 'entity' ? 'another External Entity' : 'a Data Store'}.`;
  }
  // DS cannot connect directly to EE
  if (fromNode.type === 'datastore' && toNode.type === 'entity') {
    return 'Data Store cannot connect directly to External Entity.';
  }
  if (fromNode.type === 'datastore' && toNode.type === 'datastore') {
    return 'Data Store cannot connect directly to another Data Store.';
  }
  return null;
}

export function DFDEditor({ fields, onChange, projectId }: EditorProps) {
  const useCases = useUseCases(projectId);
  const erdEntities = useERDEntities(projectId);

  const nodes = fields.nodes || [];
  const flows = fields.flows || [];

  const updateNodes = (newN: any[]) => onChange({ ...fields, nodes: newN });
  const updateFlows = (newF: any[]) => onChange({ ...fields, flows: newF });

  const addNode = (type: string) => updateNodes([...nodes, {
    id: crypto.randomUUID(),
    label: '',
    type,
    related_uc: '',
    related_erd_entity: '',
  }]);
  const updateNode = (id: string, updates: any) => updateNodes(nodes.map((n: any) => n.id === id ? { ...n, ...updates } : n));
  const removeNode = (id: string) => updateNodes(nodes.filter((n: any) => n.id !== id));

  const addFlow = () => updateFlows([...flows, { id: crypto.randomUUID(), from: '', to: '', label: '' }]);
  const updateFlow = (id: string, updates: any) => updateFlows(flows.map((f: any) => f.id === id ? { ...f, ...updates } : f));
  const removeFlow = (id: string) => updateFlows(flows.filter((f: any) => f.id !== id));

  // Flow validation errors
  const getFlowError = (flow: any) => {
    const fromNode = nodes.find((n: any) => n.id === flow.from);
    const toNode = nodes.find((n: any) => n.id === flow.to);
    return validateDFDFlow(fromNode, toNode, nodes);
  };

  // Node type icon
  const typeLabel = (type: string) => {
    if (type === 'process') return '⚙ Process';
    if (type === 'entity') return '◻ Ext. Entity';
    if (type === 'datastore') return '⊞ Data Store';
    return type;
  };

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto w-full h-full">
      {/* Components */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Components</Label>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => addNode('process')} className="h-7 text-[10px]">+ Process</Button>
            <Button size="sm" variant="outline" onClick={() => addNode('entity')} className="h-7 text-[10px]">+ Ext Entity</Button>
            <Button size="sm" variant="outline" onClick={() => addNode('datastore')} className="h-7 text-[10px]">+ Data Store</Button>
          </div>
        </div>
        <div className="space-y-2">
          {nodes.map((node: any) => (
            <div key={node.id} className="p-2 border rounded-md bg-background shadow-sm space-y-2">
              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded w-24 text-center shrink-0">{typeLabel(node.type)}</span>
                <Input value={node.label || ''} onChange={e => updateNode(node.id, { label: e.target.value })} placeholder="Name..." className="h-8 text-xs flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeNode(node.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Process → Related UC */}
              {node.type === 'process' && useCases.length > 0 && (
                <div className="flex items-center gap-2 pl-[104px]">
                  <Label className="text-[10px] text-muted-foreground shrink-0">Related UC:</Label>
                  <select value={node.related_uc || ''} onChange={e => updateNode(node.id, { related_uc: e.target.value })} className="h-6 text-[10px] border rounded bg-background px-1 flex-1">
                    <option value="">None</option>
                    {useCases.map((uc: any, i: number) => (
                      <option key={uc.id} value={uc.id}>UC-{String(i + 1).padStart(3, '0')}: {uc.name || 'Untitled'}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data Store → Related ERD Entity */}
              {node.type === 'datastore' && erdEntities.length > 0 && (
                <div className="flex items-center gap-2 pl-[104px]">
                  <Label className="text-[10px] text-muted-foreground shrink-0">ERD Entity:</Label>
                  <select value={node.related_erd_entity || ''} onChange={e => updateNode(node.id, { related_erd_entity: e.target.value })} className="h-6 text-[10px] border rounded bg-background px-1 flex-1">
                    <option value="">None</option>
                    {erdEntities.map((ent: any) => (
                      <option key={ent.id} value={ent.name}>{ent.name || 'Unnamed'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
          {nodes.length === 0 && <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">No components defined.</div>}
        </div>
      </div>

      {/* Data Flows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Data Flows</Label>
          <Button size="sm" variant="outline" onClick={addFlow} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Flow
          </Button>
        </div>
        <div className="space-y-2">
          {flows.map((flow: any) => {
            const error = getFlowError(flow);
            return (
              <div key={flow.id} className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border rounded-md bg-background shadow-sm">
                  <select value={flow.from || ''} onChange={e => updateFlow(flow.id, { from: e.target.value })} className="h-8 text-xs border rounded bg-background px-1 w-full sm:w-1/3 truncate">
                    <option value="">From...</option>
                    {nodes.map((n: any) => <option key={n.id} value={n.id}>[{n.type}] {n.label || n.id.substring(0, 6)}</option>)}
                  </select>
                  <span className="text-muted-foreground hidden sm:block">→</span>
                  <select value={flow.to || ''} onChange={e => updateFlow(flow.id, { to: e.target.value })} className="h-8 text-xs border rounded bg-background px-1 w-full sm:w-1/3 truncate">
                    <option value="">To...</option>
                    {nodes.map((n: any) => <option key={n.id} value={n.id}>[{n.type}] {n.label || n.id.substring(0, 6)}</option>)}
                  </select>
                  <Input value={flow.label || ''} onChange={e => updateFlow(flow.id, { label: e.target.value })} placeholder="Data label" className="h-8 text-xs flex-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeFlow(flow.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {error && (
                  <div className="flex items-center gap-1.5 text-[10px] text-destructive px-2">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            );
          })}
          {flows.length === 0 && <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded text-center">No flows defined.</div>}
        </div>
      </div>
    </div>
  );
}
