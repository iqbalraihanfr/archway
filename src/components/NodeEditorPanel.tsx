import { useState, useEffect, useRef, useCallback } from 'react';
import { db, NodeData, NodeContent, Attachment } from '@/lib/db';
import { generateTasksFromNode } from '@/lib/taskEngine';
import { TaskBoardEditor } from '@/components/TaskBoardEditor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { X, Save, Loader2, Check, UploadCloud, File, Trash2, Plus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import mermaid from 'mermaid';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

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
}: {
  node: NodeData;
  onClose: () => void;
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
  const isTextNode = ['project_brief', 'requirements', 'user_stories'].includes(node.type);

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
          guided_fields: {},
          free_text: "",
          mermaid_syntax: isDiagram ? (MERMAID_TEMPLATES[node.type] || "") : "",
          updated_at: now
        };
        await db.nodeContents.add(initialContent);
        data = initialContent;
      }
      
      const atts = await db.attachments.where({ node_id: node.id }).toArray();
      
      if (isMounted) {
        setContent(data);
        setFreeText(data.free_text || "");
        setMermaidSyntax(data.mermaid_syntax || "");
        // Optional: SQL schema logic could use guided_fields.sql
        setSqlSchema(data.guided_fields?.sql || "");
        setGuidedFields(data.guided_fields || {});
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
    const { sql: _sql, ...restGuidedFields } = guidedFields;
    const { sql: _contentSql, ...restContentGuidedFields } = content.guided_fields || {};

    const hasChanges = freeText !== content.free_text || 
                       mermaidSyntax !== content.mermaid_syntax ||
                       sqlSchema !== (content.guided_fields?.sql || "") ||
                       JSON.stringify(restGuidedFields) !== JSON.stringify(restContentGuidedFields);
                       
    if (!hasChanges) return;

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    setIsSaving(true);
    debounceTimeoutRef.current = setTimeout(async () => {
      const now = new Date().toISOString();
      const updatedFields = {
        ...guidedFields,
        sql: sqlSchema
      };
      
      await db.nodeContents.update(content.id, {
        free_text: freeText,
        mermaid_syntax: mermaidSyntax,
        guided_fields: updatedFields,
        updated_at: now
      });
      await db.nodes.update(node.id, { updated_at: now });
      
      setContent(prev => prev ? { 
        ...prev, 
        free_text: freeText, 
        mermaid_syntax: mermaidSyntax, 
        guided_fields: updatedFields,
        updated_at: now 
      } : null);

      // --- Task Generation Engine ---
      const updatedContent = {
        ...content,
        free_text: freeText,
        mermaid_syntax: mermaidSyntax,
        guided_fields: updatedFields,
        updated_at: now
      };
      const generatedTasks = generateTasksFromNode(node, updatedContent, node.project_id);
      
      // Delete old auto-generated tasks for this node
      const existingTasks = await db.tasks.where({ source_node_id: node.id }).toArray();
      const autoTaskIds = existingTasks.filter(t => !t.is_manual).map(t => t.id);
      if (autoTaskIds.length > 0) {
        await db.tasks.bulkDelete(autoTaskIds);
      }
      
      // Insert newly generated tasks
      if (generatedTasks.length > 0) {
        const tasksToInsert = generatedTasks.map((t: any) => ({
          ...t,
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
        }));
        await db.tasks.bulkAdd(tasksToInsert);
      }
      
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

  const renderProjectBriefForm = () => (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full h-full">
      <div className="space-y-2">
        <Label>Project Name</Label>
        <Input value={guidedFields.name || ''} onChange={(e) => setGuidedFields({...guidedFields, name: e.target.value})} placeholder="e.g. Toko Online" className="bg-background"/>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={guidedFields.description || ''} onChange={(e) => setGuidedFields({...guidedFields, description: e.target.value})} placeholder="Briefly describe the project..." className="min-h-[80px] bg-background"/>
      </div>
      <div className="space-y-2">
        <Label>Scope (In/Out)</Label>
        <Textarea value={guidedFields.scope || ''} onChange={(e) => setGuidedFields({...guidedFields, scope: e.target.value})} placeholder="What is in scope? What is out of scope?" className="min-h-[80px] bg-background"/>
      </div>
      <div className="space-y-2">
        <Label>Target User</Label>
        <Input value={guidedFields.target_user || ''} onChange={(e) => setGuidedFields({...guidedFields, target_user: e.target.value})} placeholder="Who is this for?" className="bg-background"/>
      </div>
      <div className="space-y-2">
        <Label>Tech Stack</Label>
        <Input value={guidedFields.tech_stack || ''} onChange={(e) => setGuidedFields({...guidedFields, tech_stack: e.target.value})} placeholder="e.g. Next.js, Tailwind, PostgreSQL" className="bg-background"/>
      </div>
    </div>
  );

  const renderRequirementsForm = () => {
    const items = guidedFields.items || [];
    return (
      <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full h-full">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <Label className="text-sm font-semibold">Requirements (MoSCoW)</Label>
          <Button size="sm" variant="outline" onClick={() => {
            setGuidedFields({
              ...guidedFields, 
              items: [...items, { id: crypto.randomUUID(), description: '', priority: 'Must' }]
            })
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add 
          </Button>
        </div>
        {items.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm shrink-0">
            No requirements yet. Click Add to create one.
          </div>
        )}
        <div className="space-y-3 shrink-0 pb-4">
          {items.map((item: any, index: number) => (
            <div key={item.id} className="flex items-start gap-2 p-3 border rounded-md bg-background shadow-sm">
              <div className="flex-1 space-y-2">
                <Textarea 
                  value={item.description} 
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].description = e.target.value;
                    setGuidedFields({...guidedFields, items: newItems});
                  }}
                  placeholder="Requirement description..."
                  className="min-h-[60px] resize-none"
                />
              </div>
              <div className="w-[120px] shrink-0 space-y-2 flex flex-col items-end">
                <Select 
                  value={item.priority} 
                  onValueChange={(val) => {
                    const newItems = [...items];
                    newItems[index].priority = val;
                    setGuidedFields({...guidedFields, items: newItems});
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Must">Must</SelectItem>
                    <SelectItem value="Should">Should</SelectItem>
                    <SelectItem value="Could">Could</SelectItem>
                    <SelectItem value="Won't">Won't</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    const newItems = items.filter((_: any, i: number) => i !== index);
                    setGuidedFields({...guidedFields, items: newItems});
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUserStoriesForm = () => {
    const items = guidedFields.items || [];
    return (
      <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full h-full">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <Label className="text-sm font-semibold">User Stories</Label>
          <Button size="sm" variant="outline" onClick={() => {
            setGuidedFields({
              ...guidedFields, 
              items: [...items, { id: crypto.randomUUID(), role: '', goal: '', benefit: '' }]
            })
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add 
          </Button>
        </div>
        {items.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm shrink-0">
            No user stories yet. Click Add to create one.
          </div>
        )}
        <div className="space-y-3 shrink-0 pb-4">
          {items.map((item: any, index: number) => (
            <div key={item.id} className="flex flex-col gap-3 p-4 border rounded-md bg-background relative shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  const newItems = items.filter((_: any, i: number) => i !== index);
                  setGuidedFields({...guidedFields, items: newItems});
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="grid gap-2 pr-10">
                <Label className="text-xs text-muted-foreground">As a...</Label>
                <Input 
                  value={item.role} 
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].role = e.target.value;
                    setGuidedFields({...guidedFields, items: newItems});
                  }}
                  placeholder="e.g. Administrator"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">I want...</Label>
                <Input 
                  value={item.goal} 
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].goal = e.target.value;
                    setGuidedFields({...guidedFields, items: newItems});
                  }}
                  placeholder="e.g. to manage user roles"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">So that...</Label>
                <Input 
                  value={item.benefit} 
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].benefit = e.target.value;
                    setGuidedFields({...guidedFields, items: newItems});
                  }}
                  placeholder="e.g. I can restrict access to sensitive data"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!node) return null;

  if (node.type === 'task_board') {
    return <TaskBoardEditor node={node} onClose={onClose} />;
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

      <div className="p-4 border-b shrink-0 flex items-center gap-4">
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

      <div className="flex-1 overflow-hidden flex flex-col pt-2">
        <Tabs key={node.id} defaultValue={isTextNode ? "guided" : (isDiagram ? "mermaid" : "text")} className="flex-1 flex flex-col w-full h-full">
          <div className="px-4 shrink-0">
            <TabsList className="w-full flex">
              {isTextNode && <TabsTrigger className="flex-1 text-xs" value="guided">Guided</TabsTrigger>}
              {isDiagram && <TabsTrigger className="flex-1 text-xs" value="mermaid">Mermaid</TabsTrigger>}
              {isErd && <TabsTrigger className="flex-1 text-xs" value="sql">SQL</TabsTrigger>}
              <TabsTrigger className="flex-1 text-xs" value="text">Notes</TabsTrigger>
              <TabsTrigger className="flex-1 text-xs" value="attachments">Files</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {/* Guided Tab */}
            {isTextNode && (
              <TabsContent value="guided" className="m-0 absolute inset-0 overflow-y-auto bg-muted/5">
                {node.type === 'project_brief' && renderProjectBriefForm()}
                {node.type === 'requirements' && renderRequirementsForm()}
                {node.type === 'user_stories' && renderUserStoriesForm()}
              </TabsContent>
            )}

            {/* Mermaid Tab */}
            {isDiagram && (
              <TabsContent value="mermaid" className="m-0 absolute inset-0 flex flex-col gap-4 p-4 overflow-hidden">
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
                  {mermaidError && (
                    <div className="absolute inset-0 bg-background/90 p-4 text-destructive font-mono text-xs overflow-auto z-10 whitespace-pre-wrap">
                      <div className="font-bold mb-2 uppercase">Syntax Error</div>
                      {mermaidError}
                    </div>
                  )}
                  {mermaidSvg && (
                    <div 
                      ref={mermaidRef} 
                      className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full"
                      dangerouslySetInnerHTML={{ __html: mermaidSvg }} 
                    />
                  )}
                  {!mermaidSvg && !mermaidError && (
                    <span className="text-muted-foreground">Live preview rendering...</span>
                  )}
                </div>
              </TabsContent>
            )}

            {/* SQL Tab (ERD Only) */}
            {isErd && (
              <TabsContent value="sql" className="m-0 absolute inset-0 flex flex-col gap-2 p-4">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Paste SQL CREATE TABLE statements</Label>
                <Textarea 
                  className="flex-1 font-mono text-sm resize-none whitespace-pre bg-background" 
                  placeholder="CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100)\n);"
                  value={sqlSchema}
                  onChange={(e) => setSqlSchema(e.target.value)}
                />
              </TabsContent>
            )}

            {/* Notes Tab */}
            <TabsContent value="text" className="m-0 absolute inset-0 flex flex-col p-4">
              <Textarea 
                className="flex-1 font-mono text-sm resize-none bg-background shadow-inner" 
                placeholder="Additional free text context..."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
              />
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="m-0 absolute inset-0 flex flex-col gap-4 p-4 overflow-y-auto">
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
