/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NodeData, NodeContent, TaskData } from "@/lib/db";
import { generateUserStoriesTasks } from "./userStories";
import { generateERDTasks } from "./erd";
import { generateFlowchartTasks } from "./flowchart";
import { generateSequenceTasks } from "./sequence";
import { generateDFDTasks } from "./dfd";
import { generateUseCasesTasks } from "./useCases";
import { generateRequirementTasks } from "./requirements";

export { detectDuplicateTasks } from "./utils";

/**
 * Parses node contents deterministically from structured_fields
 * Returns an array of tasks with unique source_item_id properties to enable state-merging.
 */
export function generateTasksFromNode(
  node: NodeData,
  content: NodeContent | null,
  projectId: string,
): Omit<TaskData, "id" | "created_at" | "updated_at">[] {
  if (!content || !content.structured_fields) return [];

  const fields = content.structured_fields as Record<string, any>;

  switch (node.type) {
    case "requirements":
      return generateRequirementTasks(node.id, projectId, fields);
    case "user_stories":
      return generateUserStoriesTasks(node.id, projectId, fields);
    case "erd":
      return generateERDTasks(node.id, projectId, fields);
    case "flowchart":
      return generateFlowchartTasks(node.id, projectId, fields);
    case "sequence":
      return generateSequenceTasks(node.id, projectId, fields);
    case "dfd":
      return generateDFDTasks(node.id, projectId, fields);
    case "use_cases":
      return generateUseCasesTasks(node.id, projectId, fields);
    default:
      return [];
  }
}
