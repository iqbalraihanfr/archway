import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getValidationTone } from "../utils";

export function useWorkspaceData(projectId: string) {
  const project = useLiveQuery(
    () => db.projects.get(projectId),
    [projectId],
    null,
  );
  const dbNodes = useLiveQuery(
    () => db.nodes.where({ project_id: projectId }).toArray(),
    [projectId],
    [],
  );
  const dbEdges = useLiveQuery(
    () => db.edges.where({ project_id: projectId }).toArray(),
    [projectId],
    [],
  );
  const dbContents = useLiveQuery(() => db.nodeContents.toArray(), [], []);
  const dbWarnings = useLiveQuery(
    () => db.validationWarnings.where({ project_id: projectId }).toArray(),
    [projectId],
    [],
  );

  const standardNodeOrder = useMemo(
    () => [
      "project_brief",
      "requirements",
      "user_stories",
      "use_cases",
      "flowchart",
      "dfd",
      "erd",
      "sequence",
      "task_board",
      "summary",
      "custom",
    ],
    [],
  );

  const sortedNodes = useMemo(() => {
    return [...dbNodes].sort((a, b) => {
      const orderA = standardNodeOrder.indexOf(a.type);
      const orderB = standardNodeOrder.indexOf(b.type);
      const normalizedA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
      const normalizedB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;

      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      return a.sort_order - b.sort_order;
    });
  }, [dbNodes, standardNodeOrder]);

  const recommendedNextNode = useMemo(
    () => sortedNodes.find((node) => node.status !== "Done") || null,
    [sortedNodes],
  );

  const stats = useMemo(() => {
    const doneCount = dbNodes.filter((node) => node.status === "Done").length;
    const errorCount = dbWarnings.filter((warning) => warning.severity === "error").length;
    const warningCount = dbWarnings.filter((warning) => warning.severity === "warning").length;
    const infoCount = dbWarnings.filter((warning) => warning.severity === "info").length;
    const progressPercent = dbNodes.length > 0 ? Math.round((doneCount / dbNodes.length) * 100) : 0;
    const validationTone = getValidationTone(errorCount, warningCount);

    return {
      doneCount,
      errorCount,
      warningCount,
      infoCount,
      progressPercent,
      validationTone,
    };
  }, [dbNodes, dbWarnings]);

  return {
    project,
    dbNodes,
    dbEdges,
    dbContents,
    dbWarnings,
    sortedNodes,
    recommendedNextNode,
    ...stats,
  };
}
