import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';
import { EditorProps } from './ProjectBriefEditor';
import { useBriefFields, useRequirementsFields } from '@/lib/hooks';

export function UserStoryEditor({ fields, onChange, projectId }: EditorProps) {
  const briefFields = useBriefFields(projectId);
  const reqFields = useRequirementsFields(projectId);

  const items = fields.items || [];
  const targetUsers: string[] = briefFields?.target_users || [];
  const frItems = (reqFields?.items || []).filter((i: any) => (i.type || 'FR') === 'FR');

  // Generate FR display IDs
  const getFrDisplayId = (idx: number) => `FR-${String(idx + 1).padStart(3, '0')}`;

  const updateItems = (newItems: any[]) => {
    onChange({ ...fields, items: newItems });
  };

  const addItem = () => {
    updateItems([...items, {
      id: crypto.randomUUID(),
      role: '',
      goal: '',
      benefit: '',
      related_requirement: '',
      acceptance_criteria: [],
    }]);
  };

  const updateItem = (id: string, updates: any) => {
    updateItems(items.map((it: any) => it.id === id ? { ...it, ...updates } : it));
  };

  const removeItem = (id: string) => {
    updateItems(items.filter((it: any) => it.id !== id));
  };

  // Get auto-priority from linked FR
  const getAutoPriority = (item: any) => {
    if (!item.related_requirement) return null;
    const linkedFr = frItems.find((fr: any) => fr.id === item.related_requirement);
    return linkedFr?.priority || null;
  };

  // Get US display ID
  const getUsDisplayId = (idx: number) => `US-${String(idx + 1).padStart(3, '0')}`;

  // Acceptance criteria management (Given/When/Then)
  const addCriteria = (storyId: string) => {
    const story = items.find((i: any) => i.id === storyId);
    if (!story) return;
    const ac = story.acceptance_criteria || [];
    updateItem(storyId, { acceptance_criteria: [...ac, { given: '', when: '', then: '' }] });
  };

  const updateCriteria = (storyId: string, index: number, key: 'given' | 'when' | 'then', value: string) => {
    const story = items.find((i: any) => i.id === storyId);
    if (!story) return;
    const ac = [...(story.acceptance_criteria || [])];
    // Migrate old string format to structured
    if (typeof ac[index] === 'string') {
      ac[index] = { given: ac[index], when: '', then: '' };
    }
    ac[index] = { ...ac[index], [key]: value };
    updateItem(storyId, { acceptance_criteria: ac });
  };

  const removeCriteria = (storyId: string, index: number) => {
    const story = items.find((i: any) => i.id === storyId);
    if (!story) return;
    const ac = (story.acceptance_criteria || []).filter((_: any, i: number) => i !== index);
    updateItem(storyId, { acceptance_criteria: ac });
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <Label className="text-sm font-semibold">User Stories</Label>
        <Button size="sm" variant="outline" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>

      {items.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm shrink-0">
          No user stories yet. Click Add to create one.
        </div>
      )}

      <div className="space-y-4 shrink-0 pb-4">
        {items.map((item: any, itemIdx: number) => {
          const autoPriority = getAutoPriority(item);
          return (
            <div key={item.id} className="flex flex-col gap-4 p-4 border rounded-md bg-background relative shadow-sm">
              {/* Header: Auto-ID + Priority badge + Delete */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {getUsDisplayId(itemIdx)}
                  </span>
                  {autoPriority && (
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      Priority: {autoPriority}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Role - dropdown from Brief.targetUsers */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase">As a... <span className="text-destructive">*</span></Label>
                {targetUsers.length > 0 ? (
                  <Select
                    value={item.role || ''}
                    onValueChange={(val) => updateItem(item.id, { role: val === '__none__' ? '' : val })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select a target user..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select —</SelectItem>
                      {targetUsers.map((user, idx) => (
                        <SelectItem key={idx} value={user}>{user}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={item.role || ''}
                    onChange={(e) => updateItem(item.id, { role: e.target.value })}
                    placeholder="e.g. Administrator (add Target Users in Brief first)"
                    className="h-8 text-sm"
                  />
                )}
              </div>

              {/* Want */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase">I want... <span className="text-destructive">*</span></Label>
                <Input
                  value={item.goal || ''}
                  onChange={(e) => updateItem(item.id, { goal: e.target.value.slice(0, 200) })}
                  placeholder="e.g. to manage user roles"
                  className="h-8 text-sm"
                  maxLength={200}
                />
              </div>

              {/* Benefit */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase">So that... <span className="text-destructive">*</span></Label>
                <Input
                  value={item.benefit || ''}
                  onChange={(e) => updateItem(item.id, { benefit: e.target.value.slice(0, 200) })}
                  placeholder="e.g. I can restrict access to sensitive data"
                  className="h-8 text-sm"
                  maxLength={200}
                />
              </div>

              {/* Related Requirement */}
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase">Related Requirement <span className="text-destructive">*</span></Label>
                {frItems.length > 0 ? (
                  <Select
                    value={item.related_requirement || ''}
                    onValueChange={(val) => updateItem(item.id, { related_requirement: val === '__none__' ? '' : val })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Link to a FR..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select —</SelectItem>
                      {frItems.map((fr: any, idx: number) => (
                        <SelectItem key={fr.id} value={fr.id}>
                          {getFrDisplayId(idx)}: {(fr.description || '').slice(0, 60)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">
                    No FRs defined yet. Add Functional Requirements first.
                  </p>
                )}
              </div>

              {/* Acceptance Criteria — Given/When/Then */}
              <div className="mt-2 space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground font-semibold uppercase">
                    Acceptance Criteria <span className="text-destructive">*</span>
                  </Label>
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => addCriteria(item.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Criteria
                  </Button>
                </div>

                <div className="space-y-3">
                  {(item.acceptance_criteria || []).map((ac: any, idx: number) => {
                    // Support both old string format and new structured format
                    const isStructured = typeof ac === 'object' && ac !== null;
                    return (
                      <div key={idx} className="p-3 border rounded-md bg-muted/30 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">AC-{idx + 1}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeCriteria(item.id, idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-green-600 w-12 shrink-0">GIVEN</span>
                            <Input
                              value={isStructured ? (ac.given || '') : (ac || '')}
                              onChange={(e) => updateCriteria(item.id, idx, 'given', e.target.value)}
                              placeholder="some precondition..."
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-blue-600 w-12 shrink-0">WHEN</span>
                            <Input
                              value={isStructured ? (ac.when || '') : ''}
                              onChange={(e) => updateCriteria(item.id, idx, 'when', e.target.value)}
                              placeholder="some action..."
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-purple-600 w-12 shrink-0">THEN</span>
                            <Input
                              value={isStructured ? (ac.then || '') : ''}
                              onChange={(e) => updateCriteria(item.id, idx, 'then', e.target.value)}
                              placeholder="expected outcome..."
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!(item.acceptance_criteria?.length) && (
                    <div className="text-[10px] text-muted-foreground italic pl-2 p-2 border border-dashed rounded text-center">
                      No acceptance criteria defined. (min 1 required)
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
