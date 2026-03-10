import { useState, useEffect, useRef } from 'react';
import { db, NodeData, NodeContent, TaskData, ValidationWarning } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, FileText, CheckCircle2, AlertTriangle, Layers, ListTodo } from 'lucide-react';
import mermaid from 'mermaid';
import Markdown from 'react-markdown';

// Component to render individual node summary
function NodeSummarySection({ node, content }: { node: NodeData, content: NodeContent }) {
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [mermaidError, setMermaidError] = useState<string | null>(null);

  useEffect(() => {
    const syntax = content.mermaid_manual || content.mermaid_auto;
    if (syntax) {
      const renderDiagram = async () => {
        try {
          const id = `summary-mermaid-${crypto.randomUUID()}`;
          const { svg } = await mermaid.render(id, syntax);
          setMermaidSvg(svg);
          setMermaidError(null);
        } catch (err: any) {
          setMermaidError(err.message || "Invalid Mermaid syntax");
        }
      };
      const renderTimeout = setTimeout(renderDiagram, 100);
      return () => clearTimeout(renderTimeout);
    }
  }, [content.mermaid_manual, content.mermaid_auto]);

  // Generators for different node types
  const renderGuidedText = () => {
    if (node.type === 'project_brief') {
      const g = content.structured_fields || {};
      return (
        <div className="space-y-4 text-sm">
          {g.name && <div><span className="font-semibold text-muted-foreground">Project Name:</span> {g.name}</div>}
          {g.background && <div><span className="font-semibold text-muted-foreground">Background / Why:</span> <p className="mt-1">{g.background}</p></div>}
          {g.objectives?.length > 0 && (
            <div>
              <span className="font-semibold text-muted-foreground">Objectives:</span>
              <ul className="list-disc pl-5 mt-1">{g.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul>
            </div>
          )}
          {g.target_users?.length > 0 && (
            <div><span className="font-semibold text-muted-foreground">Target Users:</span> {g.target_users.join(', ')}</div>
          )}
          {g.scope_in?.length > 0 && (
            <div>
              <span className="font-semibold text-muted-foreground">Scope In:</span>
              <ul className="list-disc pl-5 mt-1">{g.scope_in.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {g.scope_out?.length > 0 && (
            <div>
              <span className="font-semibold text-muted-foreground">Scope Out:</span>
              <ul className="list-disc pl-5 mt-1">{g.scope_out.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {g.success_metrics?.length > 0 && (
            <div>
              <span className="font-semibold text-muted-foreground">Success Metrics:</span>
              <ul className="list-disc pl-5 mt-1">{g.success_metrics.map((m: any, i: number) => <li key={i}>{m.metric}: {m.target}</li>)}</ul>
            </div>
          )}
          {g.tech_stack?.length > 0 && (
            <div><span className="font-semibold text-muted-foreground">Tech Stack:</span> {g.tech_stack.join(', ')}</div>
          )}
          {g.constraints?.length > 0 && (
            <div>
              <span className="font-semibold text-muted-foreground">Constraints:</span>
              <ul className="list-disc pl-5 mt-1">{g.constraints.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          {g.references?.length > 0 && (
            <div>
              <span className="font-semibold text-muted-foreground">References:</span>
              <ul className="list-disc pl-5 mt-1">{g.references.map((r: any, i: number) => <li key={i}>{r.name}{r.url ? ` — ${r.url}` : ''}</li>)}</ul>
            </div>
          )}
        </div>
      );
    }
    
    if (node.type === 'requirements') {
      const items = content.structured_fields?.items || [];
      if (items.length === 0) return <p className="text-sm text-muted-foreground italic">No requirements defined.</p>;
      return (
        <ul className="list-disc pl-5 space-y-2 text-sm">
          {items.map((item: any, i: number) => (
            <li key={i}>
              <span className="font-semibold">[{item.priority}]</span> {item.description}
            </li>
          ))}
        </ul>
      );
    }

    if (node.type === 'user_stories') {
      const items = content.structured_fields?.items || [];
      if (items.length === 0) return <p className="text-sm text-muted-foreground italic">No user stories defined.</p>;
      return (
        <ul className="space-y-3 text-sm">
          {items.map((item: any, i: number) => (
            <li key={i} className="bg-muted/30 p-3 rounded-md border">
              <strong>As a</strong> {item.role || '...'}, <strong>I want</strong> {item.goal || '...'}, <strong>so that</strong> {item.benefit || '...'}
            </li>
          ))}
        </ul>
      );
    }

    return null;
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-background mb-6 shadow-sm">
      <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{node.label}</h3>
        <span className="text-[10px] uppercase font-mono text-muted-foreground">{node.type}</span>
      </div>
      <div className="p-4 space-y-6">
        
        {/* Guided Content */}
        {renderGuidedText()}

        {/* Free Text */}
        {content.structured_fields?.notes && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase border-b pb-1">Notes</h4>
            <div className="text-sm prose dark:prose-invert max-w-none">
              <Markdown>{content.structured_fields.notes}</Markdown>
            </div>
          </div>
        )}

        {/* ERD SQL Fallback (if any) */}
        {node.type === 'erd' && content.structured_fields?.sql && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase border-b pb-1">SQL Schema</h4>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">{content.structured_fields.sql}</pre>
          </div>
        )}

        {/* Diagram */}
        {(content.mermaid_manual || content.mermaid_auto) && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase border-b pb-1">Diagram</h4>
            <div className="bg-white rounded-md p-4 min-h-[100px] flex items-center justify-center overflow-x-auto border">
                {mermaidError ? (
                  <div className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-950 rounded w-full">
                    {mermaidError}
                  </div>
                ) : (
                  <div 
                    dangerouslySetInnerHTML={{ __html: mermaidSvg }} 
                    className="w-full h-full flex items-center justify-center mermaid-preview"
                  />
                )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


export function SummaryNodeEditor({
  node,
  onClose,
}: {
  node: NodeData;
  onClose: () => void;
}) {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [contents, setContents] = useState<Record<string, NodeContent>>({});
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Fetch all nodes for the project
      let projectNodes = await db.nodes.where({ project_id: node.project_id }).toArray();
      
      // We don't want to summarize the summary node itself or the task board directly in this view,
      // or at least not in the same way. The requirements state "auto-compile from all nodes".
      projectNodes = projectNodes.filter(n => n.type !== 'summary' && n.type !== 'task_board' && n.status !== 'Empty');
      
      // Sort nodes logically (by sort order if applicable, or fallback to creation/ID)
      projectNodes.sort((a, b) => a.sort_order - b.sort_order);

      const allContents = await db.nodeContents.toArray();
      const contentMap: Record<string, NodeContent> = {};
      
      projectNodes.forEach(n => {
        const c = allContents.find(cont => cont.node_id === n.id);
        if (c) {
          contentMap[n.id] = c;
        }
      });

      const projectTasks = await db.tasks.where({ project_id: node.project_id }).toArray();
      const projectWarnings = await db.validationWarnings.where({ project_id: node.project_id }).toArray();

      setNodes(projectNodes);
      setContents(contentMap);
      setTasks(projectTasks);
      setWarnings(projectWarnings);
      setIsLoading(false);
    };

    loadData();
  }, [node.project_id]);

  return (
    <div className="w-[700px] shrink-0 h-full bg-card flex flex-col shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.1)] z-20 border-l relative transition-all">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Project Summary
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Auto-compiled from all in-progress and completed nodes</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-muted/10 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading summary...
          </div>
        ) : nodes.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
            No completed or in-progress nodes found. Start filling out your project nodes to see the summary.
          </div>
        ) : (
          <>
            {/* Top Level Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-background border rounded-lg p-4 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="bg-primary/10 p-2 rounded-full mb-2 text-primary"><Layers className="h-5 w-5" /></div>
                  <div className="text-2xl font-bold">{nodes.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Active Nodes</div>
               </div>
               <div className="bg-background border rounded-lg p-4 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="bg-blue-500/10 p-2 rounded-full mb-2 text-blue-500"><ListTodo className="h-5 w-5" /></div>
                  <div className="text-2xl font-bold">{tasks.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Generated Tasks</div>
               </div>
               <div className="bg-background border rounded-lg p-4 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="bg-green-500/10 p-2 rounded-full mb-2 text-green-500"><CheckCircle2 className="h-5 w-5" /></div>
                  <div className="text-2xl font-bold">{nodes.filter(n => n.status === 'Done').length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Completed Nodes</div>
               </div>
               <div className="bg-background border rounded-lg p-4 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className={`${warnings.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'} p-2 rounded-full mb-2`}><AlertTriangle className="h-5 w-5" /></div>
                  <div className="text-2xl font-bold">{warnings.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Active Warnings</div>
               </div>
            </div>

            <h3 className="text-lg font-bold text-foreground pt-4 border-b pb-2">Architecture Documentation</h3>
            
            {nodes.map((n) => {
              const content = contents[n.id];
              if (!content) return null;
              return <NodeSummarySection key={n.id} node={n} content={content} />;
            })}
          </>
        )}
      </div>
    </div>
  );
}
