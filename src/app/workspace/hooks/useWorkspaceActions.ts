import { useCallback } from "react";
import { addNode, deleteNode, connectNodes } from "@/lib/workspaceEngine";
import { NodeData } from "@/lib/db";

export function useWorkspaceActions(params: {
  projectId: string;
  dbNodes: NodeData[];
  onOpenNode: (node: NodeData) => void;
}) {
  const { projectId, dbNodes, onOpenNode } = params;

  const handleAddNode = useCallback(
    async (type: string, baseLabel: string) => {
      let x = Math.random() * 500;
      let y = Math.random() * 500 + 100;

      const normalNodes = dbNodes.filter(
        (node) => node.type !== "summary" && node.type !== "task_board",
      );

      if (normalNodes.length > 0) {
        const last = normalNodes[normalNodes.length - 1];
        x = last.position_x + 350;
        y = last.position_y;
      }

      await addNode({
        projectId,
        type,
        label: baseLabel,
        x,
        y,
        sortOrder: dbNodes.length + 1,
      });
    },
    [dbNodes, projectId],
  );

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    await deleteNode(nodeId);
  }, []);

  const handleConnect = useCallback(
    async (source: string, target: string) => {
      await connectNodes({ projectId, source, target });
    },
    [projectId],
  );

  return {
    handleAddNode,
    handleDeleteNode,
    handleConnect,
  };
}
