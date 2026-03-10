import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
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

export function FlowchartEditor({ fields, onChange, projectId }: EditorProps) {
  const useCases = useUseCases(projectId);
  const flows = fields.flows || [];

  const updateFlows = (newFlows: any[]) => onChange({ ...fields, flows: newFlows });

  const addFlow = () => {
    updateFlows([...flows, {
      id: crypto.randomUUID(),
      name: '',
      related_use_case: '',
      trigger: '',
      steps: [],
      connections: [],
    }]);
  };
  const updateFlow = (id: string, updates: any) => {
    updateFlows(flows.map((f: any) => f.id === id ? { ...f, ...updates } : f));
  };
  const removeFlow = (id: string) => {
    updateFlows(flows.filter((f: any) => f.id !== id));
  };

  // Step CRUD within a flow
  const addStep = (flowId: string) => {
    const flow = flows.find((f: any) => f.id === flowId);
    if (!flow) return;
    updateFlow(flowId, { steps: [...(flow.steps || []), { id: crypto.randomUUID(), label: '', type: 'process' }] });
  };
  const updateStep = (flowId: string, stepId: string, updates: any) => {
    const flow = flows.find((f: any) => f.id === flowId);
    if (!flow) return;
    updateFlow(flowId, { steps: (flow.steps || []).map((s: any) => s.id === stepId ? { ...s, ...updates } : s) });
  };
  const removeStep = (flowId: string, stepId: string) => {
    const flow = flows.find((f: any) => f.id === flowId);
    if (!flow) return;
    updateFlow(flowId, { steps: (flow.steps || []).filter((s: any) => s.id !== stepId) });
  };

  // Connection CRUD within a flow
  const addConnection = (flowId: string) => {
    const flow = flows.find((f: any) => f.id === flowId);
    if (!flow) return;
    updateFlow(flowId, { connections: [...(flow.connections || []), { id: crypto.randomUUID(), from: '', to: '', label: '' }] });
  };
  const updateConnection = (flowId: string, connId: string, updates: any) => {
    const flow = flows.find((f: any) => f.id === flowId);
    if (!flow) return;
    updateFlow(flowId, { connections: (flow.connections || []).map((c: any) => c.id === connId ? { ...c, ...updates } : c) });
  };
  const removeConnection = (flowId: string, connId: string) => {
    const flow = flows.find((f: any) => f.id === flowId);
    if (!flow) return;
    updateFlow(flowId, { connections: (flow.connections || []).filter((c: any) => c.id !== connId) });
  };

  // Backward compat: migrate old flat steps/connections into a single flow
  if (!fields.flows && (fields.steps?.length || fields.connections?.length)) {
    const migratedFlow = {
      id: crypto.randomUUID(),
      name: 'Main Flow',
      related_use_case: '',
      trigger: '',
      steps: fields.steps || [],
      connections: fields.connections || [],
    };
    // Trigger migration on next render
    setTimeout(() => onChange({ ...fields, flows: [migratedFlow], steps: undefined, connections: undefined }), 0);
    return <div className="p-4 text-sm text-muted-foreground">Migrating to multi-flow format...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto w-full h-full">
      <div className="flex items-center justify-between shrink-0">
        <Label className="text-sm font-semibold">Flows</Label>
        <Button size="sm" variant="outline" onClick={addFlow} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Flow
        </Button>
      </div>

      {flows.length === 0 && (
        <div className="text-xs text-muted-foreground italic p-4 border-2 border-dashed rounded-lg text-center">
          No flows defined. Each flow is linked to a Use Case.
        </div>
      )}

      {flows.map((flow: any, flowIdx: number) => (
        <div key={flow.id} className="border rounded-lg bg-background shadow-sm">
          {/* Flow header */}
          <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-primary">Flow {flowIdx + 1}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeFlow(flow.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="p-3 space-y-3">
            {/* Flow Name */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Flow Name <span className="text-destructive">*</span></Label>
              <Input value={flow.name || ''} onChange={(e) => updateFlow(flow.id, { name: e.target.value })} placeholder="e.g. User Registration Flow" className="h-8 text-sm" />
            </div>
            {/* Related Use Case */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Related Use Case <span className="text-destructive">*</span></Label>
              <select value={flow.related_use_case || ''} onChange={(e) => updateFlow(flow.id, { related_use_case: e.target.value })} className="h-8 text-xs border rounded bg-background px-2">
                <option value="">Select UC...</option>
                {useCases.map((uc: any, i: number) => (
                  <option key={uc.id} value={uc.id}>UC-{String(i + 1).padStart(3, '0')}: {uc.name || 'Untitled'}</option>
                ))}
              </select>
            </div>
            {/* Trigger */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Trigger <span className="text-destructive">*</span></Label>
              <Input value={flow.trigger || ''} onChange={(e) => updateFlow(flow.id, { trigger: e.target.value })} placeholder="e.g. User clicks Register button" className="h-8 text-sm" />
            </div>

            {/* Steps */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-semibold uppercase">Steps <span className="text-[10px] font-normal normal-case">(min 4: start + process/decision + end)</span></Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => addStep(flow.id)}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {(flow.steps || []).map((step: any) => (
                  <div key={step.id} className="flex gap-2 items-center p-1.5 border rounded bg-muted/30">
                    <select value={step.type} onChange={e => updateStep(flow.id, step.id, { type: e.target.value })} className="h-7 text-[10px] border rounded bg-background px-1 w-20">
                      <option value="start">Start</option>
                      <option value="process">Process</option>
                      <option value="decision">Decision</option>
                      <option value="end">End</option>
                    </select>
                    <Input value={step.label || ''} onChange={e => updateStep(flow.id, step.id, { label: e.target.value })} placeholder="Step label..." className="h-7 text-xs flex-1" />
                    {step.type === 'decision' && (
                      <>
                        <Input value={step.yes_target || ''} onChange={e => updateStep(flow.id, step.id, { yes_target: e.target.value })} placeholder="Yes→" className="h-7 text-[10px] w-16 bg-green-50 dark:bg-green-950/20" title="Yes path target step label" />
                        <Input value={step.no_target || ''} onChange={e => updateStep(flow.id, step.id, { no_target: e.target.value })} placeholder="No→" className="h-7 text-[10px] w-16 bg-red-50 dark:bg-red-950/20" title="No path target step label" />
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeStep(flow.id, step.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {(flow.steps || []).length === 0 && <div className="text-[10px] text-muted-foreground italic p-2 border border-dashed rounded text-center">No steps.</div>}
              </div>
            </div>

            {/* Connections */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-semibold uppercase">Connections</Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => addConnection(flow.id)}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {(flow.connections || []).map((conn: any) => (
                  <div key={conn.id} className="flex items-center gap-2 p-1.5 border rounded bg-muted/30">
                    <select value={conn.from || ''} onChange={e => updateConnection(flow.id, conn.id, { from: e.target.value })} className="h-7 text-[10px] border rounded bg-background px-1 flex-1">
                      <option value="">From...</option>
                      {(flow.steps || []).map((s: any) => <option key={s.id} value={s.id}>{s.label || s.id.substring(0, 6)}</option>)}
                    </select>
                    <span className="text-muted-foreground text-xs">→</span>
                    <select value={conn.to || ''} onChange={e => updateConnection(flow.id, conn.id, { to: e.target.value })} className="h-7 text-[10px] border rounded bg-background px-1 flex-1">
                      <option value="">To...</option>
                      {(flow.steps || []).map((s: any) => <option key={s.id} value={s.id}>{s.label || s.id.substring(0, 6)}</option>)}
                    </select>
                    <Input value={conn.label || ''} onChange={e => updateConnection(flow.id, conn.id, { label: e.target.value })} placeholder="Label" className="h-7 text-[10px] w-20" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeConnection(flow.id, conn.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
