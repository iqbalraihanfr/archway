import { useState, useEffect, useRef, useCallback } from 'react';
import { db, NodeData, NodeContent, Attachment } from '@/lib/db';
import { generateTasksFromNode } from '@/lib/taskEngine';
import { crossValidateAll } from '@/lib/validationEngine';
import { TaskBoardEditor } from '@/components/TaskBoardEditor';
import { SummaryNodeEditor } from '@/components/SummaryNodeEditor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { X, Save, Loader2, Check, UploadCloud, File, Trash2, Plus, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import mermaid from 'mermaid';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { exportDiagramToPNG } from '@/lib/exportEngine';
import { ProjectBriefEditor } from '@/components/editors/ProjectBriefEditor';
import { RequirementEditor } from '@/components/editors/RequirementEditor';
import { UserStoryEditor } from '@/components/editors/UserStoryEditor';
import { UseCaseEditor } from '@/components/editors/UseCaseEditor';
import { ERDEditor } from '@/components/editors/ERDEditor';
import { SequenceEditor } from '@/components/editors/SequenceEditor';
import { FlowchartEditor } from '@/components/editors/FlowchartEditor';
import { DFDEditor } from '@/components/editors/DFDEditor';
import { generateMermaid } from '@/lib/diagramGenerators';

// Initial mermaid templates
const MERMAID_TEMPLATES: Record<string, string> = {
  flowchart: `flowchart TD\n    A[Start] --> B[Process]\n    B --> C{Decision?}\n    C -- Yes --> D[Action]\n    C -- No --> E[Other Action]\n    D --> F[End]\n    E --> F`,
  erd: `erDiagram\n    USERS ||--|{ ORDERS : places\n    ORDERS ||--|{ ORDER_ITEMS : contains\n    PRODUCTS ||--o{ ORDER_ITEMS : included_in\n\n    USERS {\n        string id PK\n        string name\n        string email\n    }`,
  sequence: `sequenceDiagram\n    actor User\n    participant Frontend\n    participant Backend\n    participant Database\n\n    User->>Frontend: Action\n    Frontend->>Backend: API Request\n    Backend->>Database: Query\n    Database-->>Backend: Result\n    Backend-->>Frontend: Response\n    Frontend-->>User: Display`,
  use_case: `graph TD\n    subgraph System\n        UC1((Use Case 1))\n        UC2((Use Case 2))\n    end\n    Actor1[Actor] --> UC1\n    Actor1 --> UC2`,
  dfd: `graph LR\n    EE1[External Entity] -->|data flow| P1((Process))\n    P1 -->|output| DS1[(Data Store)]\n    DS1 -->|read| P2((Process 2))\n    P2 -->|result| EE2[External Entity 2]`,
};

const DIAGRAM_NODES = ['flowchart', 'erd', 'dfd', 'use_case', 'sequence'];

// Initialize Mermaid outside component to avoid re-init
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

export function NodeEditorPanel({
  node,
  onClose,
  onDelete
}: {
  node: NodeData;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [content, setContent] = useState<NodeContent | null>(null);
  const [status, setStatus] = useState<NodeData['status']>(node.status);
  
  // Tab states
  const [freeText, setFreeText] = useState("");
  const [mermaidSyntax, setMermaidSyntax] = useState("");
  const [sqlSchema, setSqlSchema] = useState("");
  const [guidedFields, setGuidedFields] = useState<any>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  const [mermaidSvg, setMermaidSvg] = useState<string>("");

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);

  const isDiagram = DIAGRAM_NODES.includes(node.type);
  const isErd = node.type === 'erd';
  const hasGuidedEditor = ['project_brief', 'requirements', 'user_stories', 'use_cases', 'erd', 'sequence', 'flowchart', 'dfd'].includes(node.type);

  // Load content & attachments
  useEffect(() => {
    let isMounted = true;
    setStatus(node.status);
    
    const loadData = async () => {
      let data = await db.nodeContents.where({ node_id: node.id }).first();
      if (!data) {
        const newId = crypto.randomUUID();
        const now = new Date().toISOString();
        const initialContent: NodeContent = {
          id: newId,
          node_id: node.id,
          structured_fields: {},
          mermaid_auto: isDiagram ? (MERMAID_TEMPLATES[node.type] || "") : "",
          mermaid_manual: "",
          updated_at: now
        };
        await db.nodeContents.add(initialContent);
        data = initialContent;
      }
      
      const atts = await db.attachments.where({ node_id: node.id }).toArray();
      
      if (isMounted) {
        setContent(data);
        setFreeText(data.structured_fields?.notes || "");
        setMermaidSyntax(data.mermaid_manual || data.mermaid_auto || "");
        setSqlSchema(data.structured_fields?.sql || "");

        // Migrate old Brief field names to v3 structured format
        let sf = data.structured_fields || {};
        if (node.type === 'project_brief') {
          let migrated = false;
          if (sf.description && !sf.background) { sf = { ...sf, background: sf.description }; delete sf.description; migrated = true; }
          if (typeof sf.target_user === 'string' && !sf.target_users) {
            sf = { ...sf, target_users: sf.target_user.split(',').map((s: string) => s.trim()).filter(Boolean) };
            delete sf.target_user;
            migrated = true;
          }
          if (typeof sf.scope === 'string' && !sf.scope_in) {
            sf = { ...sf, scope_in: sf.scope ? [sf.scope] : [] };
            delete sf.scope;
            migrated = true;
          }
          if (typeof sf.success_metrics === 'string' && !Array.isArray(sf.success_metrics)) {
            sf = { ...sf, success_metrics: sf.success_metrics ? [{ metric: sf.success_metrics, target: '' }] : [] };
            migrated = true;
          }
          if (typeof sf.constraints === 'string' && !Array.isArray(sf.constraints)) {
            sf = { ...sf, constraints: sf.constraints ? [sf.constraints] : [] };
            migrated = true;
          }
          if (typeof sf.tech_stack === 'string' && !Array.isArray(sf.tech_stack)) {
            sf = { ...sf, tech_stack: sf.tech_stack.split(',').map((s: string) => s.trim()).filter(Boolean) };
            migrated = true;
          }
          if (migrated) {
            await db.nodeContents.update(data.id, { structured_fields: sf });
          }
        }
        setGuidedFields(sf);
        setAttachments(atts);
      }
    };
    loadData();
    
    return () => { isMounted = false; };
  }, [node.id, node.status, node.type, isDiagram]);

  // Handle Status Change
  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus) return;
    const validStatus = newStatus as NodeData['status'];
    setStatus(validStatus);
    await db.nodes.update(node.id, { status: validStatus, updated_at: new Date().toISOString() });
  };

  // Auto Save Logic for text content
  useEffect(() => {
    if (!content) return;
    
    // Compare guided fields (excluding runtime sql which is separate)
    const { sql: _sql, notes: _notes, ...restGuidedFields } = guidedFields;
    const { sql: _contentSql, notes: _cNotes, ...restContentGuidedFields } = content.structured_fields || {};

    const hasChanges = freeText !== (content.structured_fields?.notes || "") || 
                       mermaidSyntax !== (content.mermaid_manual || content.mermaid_auto || "") ||
                       sqlSchema !== (content.structured_fields?.sql || "") ||
                       JSON.stringify(restGuidedFields) !== JSON.stringify(restContentGuidedFields);
                       
    const autoMermaid = isDiagram ? generateMermaid(node.type, guidedFields) : content.mermaid_auto;

    if (!hasChanges && autoMermaid === content.mermaid_auto) return;

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    setIsSaving(true);
    debounceTimeoutRef.current = setTimeout(async () => {
      const now = new Date().toISOString();
      const updatedFields = {
        ...guidedFields,
        notes: freeText,
        sql: sqlSchema
      };
      
      await db.nodeContents.update(content.id, {
        mermaid_manual: mermaidSyntax,
        mermaid_auto: autoMermaid,
        structured_fields: updatedFields,
        updated_at: now
      });
      await db.nodes.update(node.id, { updated_at: now });
      
      setContent(prev => prev ? { 
        ...prev, 
        mermaid_manual: mermaidSyntax, 
        mermaid_auto: autoMermaid,
        structured_fields: updatedFields,
        updated_at: now 
      } : null);

      // --- Task Generation Engine ---
      const updatedContent = {
        ...content,
        mermaid_manual: mermaidSyntax,
        mermaid_auto: autoMermaid,
        structured_fields: updatedFields,
        updated_at: now
      };
      const generatedTasks = generateTasksFromNode(node, updatedContent, node.project_id);
      
      const existingTasks = await db.tasks.where({ source_node_id: node.id }).toArray();
      const existingAutoTasksMap = new Map();
      
      existingTasks.forEach(t => {
        if (!t.is_manual && t.source_item_id) {
           existingAutoTasksMap.set(t.source_item_id, t);
        }
      });
      
      const tasksToPut: any[] = [];
      const tasksToKeepIds = new Set<string>();
      
      for (const gt of generatedTasks) {
        if (gt.source_item_id && existingAutoTasksMap.has(gt.source_item_id)) {
           // update title/desc but keep status/labels
           const existing = existingAutoTasksMap.get(gt.source_item_id);
           tasksToPut.push({
             ...existing,
             title: gt.title,
             description: gt.description,
             group_key: gt.group_key,
             priority: gt.priority,
             updated_at: now
           });
           tasksToKeepIds.add(existing.id);
        } else {
           // insert new
           tasksToPut.push({
             ...gt,
             id: crypto.randomUUID(),
             created_at: now,
             updated_at: now,
           });
        }
      }
      
      // Delete auto tasks that are no longer generated
      const autoTaskIdsToDelete = existingTasks
         .filter(t => !t.is_manual && !tasksToKeepIds.has(t.id))
         .map(t => t.id);
         
      if (autoTaskIdsToDelete.length > 0) {
         await db.tasks.bulkDelete(autoTaskIdsToDelete);
      }
      if (tasksToPut.length > 0) {
         await db.tasks.bulkPut(tasksToPut);
      }
      
      // Run cross project validation
      await crossValidateAll(node.project_id);
      
      setIsSaving(false);
      setLastSaved(new Date());
    }, 1000);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [freeText, mermaidSyntax, sqlSchema, content, node.id]);

  // Render Mermaid live preview
  useEffect(() => {
    if (!isDiagram || !mermaidSyntax.trim()) {
      setMermaidSvg("");
      return;
    }
    
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, mermaidSyntax);
        setMermaidSvg(svg);
        setMermaidError(null);
      } catch (err: any) {
        // Syntax error in mermaid
        setMermaidError(err.message || "Invalid Mermaid syntax");
      }
    };
    
    // Debounce rendering slightly for performance
    const renderTimeout = setTimeout(renderDiagram, 500);
    return () => clearTimeout(renderTimeout);
  }, [mermaidSyntax, isDiagram]);

  // Handle File Uploads
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newAtts: Attachment[] = [];
    const now = new Date().toISOString();
    
    for (const file of acceptedFiles) {
      const attId = crypto.randomUUID();
      const attachment: Attachment = {
        id: attId,
        node_id: node.id,
        filename: file.name,
        mime_type: file.type,
        size: file.size,
        data: file, // Blobs are supported directly by Dexie
        created_at: now
      };
      await db.attachments.add(attachment);
      newAtts.push(attachment);
    }
    
    setAttachments(prev => [...prev, ...newAtts]);
  }, [node.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const deleteAttachment = async (attId: string) => {
    await db.attachments.delete(attId);
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };
  
  // UI Helper format size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Old inline forms removed

  if (!node) return null;

  if (node.type === 'task_board') {
    return <TaskBoardEditor node={node} onClose={onClose} />;
  }

  if (node.type === 'summary') {
    return <SummaryNodeEditor node={node} onClose={onClose} />;
  }

  return (
    <div className="w-[600px] shrink-0 h-full bg-card flex flex-col shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.1)] z-20 border-l relative transition-all">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground">{node.label}</h2>
          <p className="text-xs text-muted-foreground capitalize mt-1 font-mono tracking-wider">{node.type} NODE</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center h-8">
            {isSaving ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Saving...</span>
            ) : lastSaved ? (
              <span className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1"><Check className="h-3 w-3"/> Saved</span>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 border-b shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Status</Label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Empty">Empty</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col pt-2">
        <Tabs key={node.id} defaultValue={hasGuidedEditor ? "guided" : "text"} className="flex-1 flex flex-col w-full h-full">
          <div className="px-4 shrink-0">
            <TabsList className="w-full flex">
              {hasGuidedEditor && <TabsTrigger className="flex-1 text-xs" value="guided">Guided</TabsTrigger>}
              {isDiagram && <TabsTrigger className="flex-1 text-xs" value="mermaid">Mermaid</TabsTrigger>}
              {isErd && <TabsTrigger className="flex-1 text-xs" value="sql">SQL</TabsTrigger>}
              <TabsTrigger className="flex-1 text-xs" value="text">Notes</TabsTrigger>
              <TabsTrigger className="flex-1 text-xs" value="attachments">Files</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {/* Guided Tab — primary data source */}
            {hasGuidedEditor && (
              <TabsContent value="guided" className="m-0 absolute inset-0 overflow-hidden bg-muted/5 flex flex-col">
                <div className="px-4 pt-3 pb-1 shrink-0">
                  <p className="text-[10px] text-muted-foreground bg-primary/5 border border-primary/10 rounded px-2 py-1">Data utama — isi di sini untuk generate diagram, tasks, validasi, dan export otomatis.</p>
                </div>
                <div className="flex-1 overflow-hidden">
                  {node.type === 'project_brief' && <ProjectBriefEditor fields={guidedFields} onChange={setGuidedFields} projectId={node.project_id} />}
                  {node.type === 'requirements' && <RequirementEditor fields={guidedFields} onChange={setGuidedFields} projectId={node.project_id} />}
                  {node.type === 'user_stories' && <UserStoryEditor fields={guidedFields} onChange={setGuidedFields} projectId={node.project_id} />}
                  {node.type === 'use_cases' && <UseCaseEditor fields={guidedFields} onChange={setGuidedFields} projectId={node.project_id} />}
                  {node.type === 'erd' && <ERDEditor fields={guidedFields} onChange={setGuidedFields} projectId={node.project_id} />}
                  {node.type === 'sequence' && <SequenceEditor fields={guidedFields} onChange={setGuidedFields} projectId={node.project_id} />}
                  {node.type === 'flowchart' && <FlowchartEditor fields={guidedFields} onChange={setGuidedFields} projectId={node.project_id} />}
                  {node.type === 'dfd' && <DFDEditor fields={guidedFields} onChange={setGuidedFields} projectId={node.project_id} />}
                </div>
              </TabsContent>
            )}

            {/* Mermaid Tab — auto-generated, manual override possible */}
            {isDiagram && (
              <TabsContent value="mermaid" className="m-0 absolute inset-0 flex flex-col gap-4 p-4 overflow-hidden">
                <p className="text-[10px] text-muted-foreground bg-muted/50 border rounded px-2 py-1 shrink-0">Auto-generated dari Guided tab. Edit manual di sini tidak akan balik ke Guided.</p>
                <div className="flex-1 border rounded-md overflow-hidden bg-background">
                  <CodeMirror
                    value={mermaidSyntax}
                    height="100%"
                    extensions={[javascript()]}
                    onChange={(val) => setMermaidSyntax(val)}
                    theme="dark"
                    className="h-full text-sm"
                  />
                </div>
                <div className="flex-1 border rounded-md bg-secondary/20 p-4 overflow-auto flex items-center justify-center relative">
                  {!mermaidError && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (mermaidRef.current) exportDiagramToPNG(mermaidRef.current, `${node.label}-diagram`);
                      }}
                      className="absolute top-2 right-2 text-xs h-7 opacity-50 hover:opacity-100"
                    >
                      <Download className="h-3 w-3 mr-1" /> Export PNG
                    </Button>
                  )}
                  {mermaidError ? (
                    <div className="absolute inset-0 bg-background/90 p-4 text-destructive font-mono text-xs overflow-auto z-10 whitespace-pre-wrap">
                      <div className="font-bold mb-2 uppercase">Syntax Error</div>
                      {mermaidError}
                    </div>
                  ) : (
                    <div 
                      ref={mermaidRef}
                      dangerouslySetInnerHTML={{ __html: mermaidSvg }} 
                      className="w-full h-full flex items-center justify-center mermaid-preview bg-white"
                    />
                  )}
                  {!mermaidSvg && !mermaidError && (
                    <span className="text-muted-foreground">Live preview rendering...</span>
                  )}
                </div>
              </TabsContent>
            )}

            {/* SQL Tab (ERD Only) — reference only */}
            {isErd && (
              <TabsContent value="sql" className="m-0 absolute inset-0 flex flex-col gap-2 p-4">
                <p className="text-[10px] text-muted-foreground bg-muted/50 border rounded px-2 py-1">Referensi — paste SQL di sini sebagai catatan. Belum di-parse otomatis ke Guided.</p>
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Paste SQL CREATE TABLE statements</Label>
                <Textarea 
                  className="flex-1 font-mono text-sm resize-none whitespace-pre bg-background" 
                  placeholder="CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100)\n);"
                  value={sqlSchema}
                  onChange={(e) => setSqlSchema(e.target.value)}
                />
              </TabsContent>
            )}

            {/* Notes Tab — free text reference */}
            <TabsContent value="text" className="m-0 absolute inset-0 flex flex-col gap-2 p-4">
              <p className="text-[10px] text-muted-foreground bg-muted/50 border rounded px-2 py-1 shrink-0">Catatan bebas — tidak mempengaruhi diagram, tasks, atau validasi.</p>
              <Textarea 
                className="flex-1 font-mono text-sm resize-none bg-background shadow-inner" 
                placeholder="Additional free text context..."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
              />
            </TabsContent>

            {/* Attachments Tab — file storage reference */}
            <TabsContent value="attachments" className="m-0 absolute inset-0 flex flex-col gap-4 p-4 overflow-y-auto">
              <p className="text-[10px] text-muted-foreground bg-muted/50 border rounded px-2 py-1 shrink-0">Simpan dokumen referensi (BQ, quotation, mockup). File tidak di-parse otomatis.</p>
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-secondary/50'}`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">Drag & drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <p className="text-xs text-muted-foreground mt-4 font-mono">PDF, DOCX, IMG, MD (max 10MB)</p>
              </div>

              {attachments.length > 0 && (
                <div className="flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold mb-3 border-b pb-2">Attached Files ({attachments.length})</h3>
                  <div className="space-y-2 flex-1 overflow-y-auto pb-4">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <File className="h-5 w-5 text-primary" />
                          </div>
                          <div className="overflow-hidden flex flex-col justify-center">
                            <p className="text-sm font-medium truncate" title={att.filename}>{att.filename}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{formatSize(att.size)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => deleteAttachment(att.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
