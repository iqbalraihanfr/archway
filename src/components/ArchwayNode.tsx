import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeData } from '@/lib/db';
import { FileText, Database, CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ArchwayNode = memo(({ data, selected }: { data: Record<string, unknown>, selected: boolean }) => {
  const nodeData = data as unknown as NodeData & { isNext?: boolean };
  const getStatusIcon = (status: NodeData['status']) => {
    switch (status) {
      case 'Done': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'In Progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Circle className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'erd': return <Database className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="w-2 h-2 rounded-full bg-primary" />
      <div
        className={cn(
          "px-4 py-3 shadow-lg rounded-xl border-2 bg-card text-card-foreground min-w-[200px] transition-all",
          selected ? "border-primary ring-2 ring-primary/20" : 
          nodeData.isNext ? "border-primary/70 ring-2 ring-primary/30 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)]" : 
          "border-border hover:border-primary/50"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-secondary rounded-md text-secondary-foreground">
              {getTypeIcon(nodeData.type)}
            </div>
            <div className="font-semibold text-sm">{nodeData.label}</div>
          </div>
          <div className="ml-3" title={`Status: ${nodeData.status}`}>
            {getStatusIcon(nodeData.status)}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 rounded-full bg-primary" />
    </>
  );
});

ArchwayNode.displayName = 'ArchwayNode';
