import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/**
 * Fetches the Brief node's structured_fields for a given project.
 * Used by downstream editors (Requirements, User Stories, Use Cases, etc.)
 * to populate cross-reference dropdowns.
 */
export function useBriefFields(projectId?: string) {
  return useLiveQuery(async () => {
    if (!projectId) return null;
    const briefNode = await db.nodes.where({ project_id: projectId, type: 'project_brief' }).first();
    if (!briefNode) return null;
    const content = await db.nodeContents.where({ node_id: briefNode.id }).first();
    return content?.structured_fields || null;
  }, [projectId], null);
}

/**
 * Fetches the Requirements node's structured_fields for a given project.
 * Used by User Stories editor for FR dropdown.
 */
export function useRequirementsFields(projectId?: string) {
  return useLiveQuery(async () => {
    if (!projectId) return null;
    const reqNode = await db.nodes.where({ project_id: projectId, type: 'requirements' }).first();
    if (!reqNode) return null;
    const content = await db.nodeContents.where({ node_id: reqNode.id }).first();
    return content?.structured_fields || null;
  }, [projectId], null);
}
