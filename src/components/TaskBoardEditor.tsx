import { useState, useEffect } from 'react';
import { db, TaskData, NodeData } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, RefreshCw, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { generateTasksFromNode } from '@/lib/taskEngine';

export function TaskBoardEditor({
  node,
  onClose,
}: {
  node: NodeData;
  onClose: () => void;
}) {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [grouping, setGrouping] = useState<'flat' | 'source' | 'status'>('source');

  // Load Tasks
  const loadTasks = async () => {
    const projectTasks = await db.tasks.where({ project_id: node.project_id }).toArray();
    const projectNodes = await db.nodes.where({ project_id: node.project_id }).toArray();
    setTasks(projectTasks.sort((a, b) => a.sort_order - b.sort_order));
    setNodes(projectNodes);
  };

  useEffect(() => {
    loadTasks();
  }, [node.project_id]);

  // Handle Task Updates
  const updateTask = async (id: string, updates: Partial<TaskData>) => {
    await db.tasks.update(id, { ...updates, updated_at: new Date().toISOString() });
    loadTasks();
  };

  const deleteTask = async (id: string) => {
    await db.tasks.delete(id);
    loadTasks();
  };

  const addManualTask = async () => {
    const newTask: TaskData = {
      id: crypto.randomUUID(),
      project_id: node.project_id,
      source_node_id: null,
      title: 'New Manual Task',
      description: '',
      group_key: 'Manual',
      priority: 'should',
      labels: [],
      is_manual: true,
      sort_order: tasks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.tasks.add(newTask);
    loadTasks();
  };

  // Regeneration Logic
  const regenerateAllTasks = async () => {
    if (!confirm('This will regenerate all auto-generated tasks. Manual tasks will be preserved. Continue?')) return;
    
    setIsRegenerating(true);
    try {
      // 1. Delete all auto-generated tasks
      const autoTasks = tasks.filter(t => !t.is_manual);
      await db.tasks.bulkDelete(autoTasks.map(t => t.id));

      // 2. Fetch all nodes and content
      const allContents = await db.nodeContents.toArray();
      const allParsedTasks: TaskData[] = [];

      for (const n of nodes) {
        const content = allContents.find(c => c.node_id === n.id);
        if (content) {
          const generated = generateTasksFromNode(n, content, node.project_id);
          const mapped = generated.map(t => ({
            ...t,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          allParsedTasks.push(...mapped);
        }
      }

      // 3. Insert fresh tasks
      if (allParsedTasks.length > 0) {
        await db.tasks.bulkAdd(allParsedTasks);
      }
      
      await loadTasks();
    } finally {
      setIsRegenerating(false);
    }
  };

  // Grouping logic
  let groupedTasks: Record<string, TaskData[]> = {};
  if (grouping === 'flat') {
    groupedTasks = { 'All Tasks': tasks };
  } else if (grouping === 'source') {
    tasks.forEach(task => {
      const sourceNodeName = task.source_node_id 
        ? nodes.find(n => n.id === task.source_node_id)?.label || 'Unknown Source'
        : 'Manual Tasks';
      if (!groupedTasks[sourceNodeName]) groupedTasks[sourceNodeName] = [];
      groupedTasks[sourceNodeName].push(task);
    });
  } else if (grouping === 'status') {
     // A simplified status mapping for demonstration (since TaskData primarily uses priority now)
     tasks.forEach(task => {
        const priorityGroup = task.priority.toUpperCase();
        if (!groupedTasks[priorityGroup]) groupedTasks[priorityGroup] = [];
        groupedTasks[priorityGroup].push(task);
     });
  }

  return (
    <div className="w-[600px] shrink-0 h-full bg-card flex flex-col shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.1)] z-20 border-l relative transition-all">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Task Board
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Generated Execution Plan</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b shrink-0 flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Group By:</Label>
          <Select value={grouping} onValueChange={(val: any) => setGrouping(val)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="source">Source Node</SelectItem>
              <SelectItem value="status">Priority</SelectItem>
              <SelectItem value="flat">Flat List</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addManualTask}>
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
          <Button size="sm" onClick={regenerateAllTasks} disabled={isRegenerating}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
          <div key={groupName} className="space-y-3">
            <h3 className="text-sm font-semibold sticky top-0 bg-card py-1 z-10 border-b">{groupName} ({groupTasks.length})</h3>
            <div className="space-y-3">
              {groupTasks.map((task) => (
                <div key={task.id} className="border rounded-md p-3 bg-background shadow-sm space-y-3 relative group">
                  {!task.is_manual && (
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-bl-md rounded-tr-md font-medium">
                      Auto-generated
                    </div>
                  )}
                  <div className="pr-16">
                    <Input 
                      value={task.title} 
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      className="font-semibold border-transparent hover:border-input focus:border-input h-8 px-2 -ml-2"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
                      <Textarea 
                        value={task.description} 
                        onChange={(e) => updateTask(task.id, { description: e.target.value })}
                        className="text-sm min-h-[60px] resize-none"
                      />
                    </div>
                    
                    <div className="w-[120px] shrink-0 space-y-3 flex flex-col justify-end items-end">
                      <div className="space-y-1 w-full flex flex-col items-end">
                        <Label className="text-[10px] uppercase text-muted-foreground">Priority</Label>
                        <Select 
                          value={task.priority} 
                          onValueChange={(val: any) => updateTask(task.id, { priority: val })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="must">Must</SelectItem>
                            <SelectItem value="should">Should</SelectItem>
                            <SelectItem value="could">Could</SelectItem>
                            <SelectItem value="wont">Won't</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteTask(task.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {groupTasks.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No tasks in this group.</p>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
            No tasks found. Open documents and write requirements or click Regenerate.
          </div>
        )}
      </div>
    </div>
  );
}
