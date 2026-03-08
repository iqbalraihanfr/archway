import { NodeData, NodeContent, TaskData } from '@/lib/db';

/**
 * Parses node contents based on the node type and returns an array of auto-generated tasks.
 */
export function generateTasksFromNode(
  node: NodeData,
  content: NodeContent | null,
  projectId: string
): Omit<TaskData, 'id' | 'created_at' | 'updated_at'>[] {
  if (!content) return [];

  const tasks: Omit<TaskData, 'id' | 'created_at' | 'updated_at'>[] = [];

  switch (node.type) {
    case 'user_stories': {
      const items = content.guided_fields?.items || [];
      items.forEach((item: any, index: number) => {
        if (!item.goal) return;
        tasks.push({
          project_id: projectId,
          source_node_id: node.id,
          title: `Implement: ${item.goal}`,
          description: `As a ${item.role || 'user'}, I want to ${item.goal} so that ${item.benefit || 'it works'}`,
          group_key: 'User Stories',
          priority: 'should',
          labels: ['feature'],
          is_manual: false,
          sort_order: index,
        });
      });
      break;
    }

    case 'erd': {
      const syntax = content.mermaid_syntax || '';
      // Matches ERD Entities: e.g. "USERS {" or "ORDER_DETAILS{"
      const entityRegex = /^[ \t]*([a-zA-Z0-9_]+)[ \t]*\{/gm;
      let match;
      let order = 0;
      const seen = new Set<string>();

      while ((match = entityRegex.exec(syntax)) !== null) {
        const entity = match[1];
        if (seen.has(entity)) continue;
        seen.add(entity);

        tasks.push({
          project_id: projectId,
          source_node_id: node.id,
          title: `Create ${entity} table and model`,
          description: `Database schema implementation for ${entity} entity.`,
          group_key: 'Database',
          priority: 'must',
          labels: ['db', 'schema'],
          is_manual: false,
          sort_order: order++,
        });
      }
      break;
    }

    case 'flowchart': {
      const syntax = content.mermaid_syntax || '';
      // Parse process nodes [Process Name] or (Process Name)
      // Parse decision nodes {Decision Name}
      const processRegex = /\[(.*?)\]|\((.*?)\)|\{(.*?)\}/g;
      let match;
      let order = 0;
      const seen = new Set<string>();
      
      while ((match = processRegex.exec(syntax)) !== null) {
        const label = (match[1] || match[2] || match[3])?.trim();
        if (!label || seen.has(label)) continue;
        seen.add(label);
        
        const isDecision = !!match[3];
        tasks.push({
          project_id: projectId,
          source_node_id: node.id,
          title: isDecision ? `Validation: ${label}` : `Build sequence: ${label}`,
          description: isDecision ? `Implement logical validation and branching for: ${label}` : `Implement process and logic for: ${label}`,
          group_key: 'Implementation',
          priority: 'must',
          labels: isDecision ? ['logic', 'validation'] : ['logic', 'feature'],
          is_manual: false,
          sort_order: order++,
        });
      }
      break;
    }

    case 'sequence': {
      const syntax = content.mermaid_syntax || '';
      // Parse messages e.g. Client->>API: POST /login
      // Matches everything after the colon
      const messageRegex = /->(?:>|x|\-|\+)?[ \t]*.*?:[ \t]*(.+)/g;
      let match;
      let order = 0;
      const seen = new Set<string>();

      while ((match = messageRegex.exec(syntax)) !== null) {
        const message = match[1].trim();
        if (!message || seen.has(message)) continue;
        seen.add(message);

        tasks.push({
          project_id: projectId,
          source_node_id: node.id,
          title: `Implement integration: ${message}`,
          description: `API / Integration implementation as defined in the Sequence Diagram.`,
          group_key: 'API & Integration',
          priority: 'must',
          labels: ['api', 'integration'],
          is_manual: false,
          sort_order: order++,
        });
      }
      break;
    }

    // You can easily add rules for `dfd`, `use_case`, etc. here.
  }

  return tasks;
}
