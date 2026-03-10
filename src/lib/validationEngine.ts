/* eslint-disable @typescript-eslint/no-explicit-any */
import { db, ValidationWarning } from "./db";

export interface LocalValidationIssue {
  field: string;
  message: string;
}

export function validateNode(
  nodeType: string,
  fields: any,
): LocalValidationIssue[] {
  const issues: LocalValidationIssue[] = [];

  if (!fields) return issues;

  if (nodeType === "project_brief") {
    if (!fields.name)
      issues.push({ field: "name", message: "Project Name is missing." });
    if (!fields.background)
      issues.push({
        field: "background",
        message: "Background / Why is missing.",
      });
    if (!fields.objectives || fields.objectives.length === 0)
      issues.push({
        field: "objectives",
        message: "At least one objective is required.",
      });
    if (!fields.target_users || fields.target_users.length === 0)
      issues.push({
        field: "target_users",
        message: "At least one target user is required.",
      });
    if (!fields.scope_in || fields.scope_in.length === 0)
      issues.push({
        field: "scope_in",
        message: "At least one Scope In item is required.",
      });
    if (!fields.scope_out || fields.scope_out.length === 0)
      issues.push({
        field: "scope_out",
        message: "At least one Scope Out item is required.",
      });
    if (!fields.success_metrics || fields.success_metrics.length === 0)
      issues.push({
        field: "success_metrics",
        message: "At least one success metric is required.",
      });
  }

  if (nodeType === "requirements") {
    const items = fields.items || [];
    const frs = items.filter((i: any) => (i.type || "FR") === "FR");
    const nfrs = items.filter((i: any) => i.type === "NFR");
    if (frs.length < 3)
      issues.push({
        field: "items",
        message: `Min 3 Functional Requirements required (currently ${frs.length}).`,
      });
    if (nfrs.length < 1)
      issues.push({
        field: "items",
        message: "At least 1 Non-Functional Requirement is required.",
      });
    if (!items.some((i: any) => i.priority === "Must"))
      issues.push({
        field: "items",
        message: 'At least 1 requirement must have "Must" priority.',
      });
  }

  if (nodeType === "user_stories") {
    if (!fields.items || fields.items.length === 0)
      issues.push({ field: "items", message: "No user stories defined." });
    else {
      fields.items.forEach((st: any, i: number) => {
        if (!st.role || !st.goal)
          issues.push({
            field: `items[${i}]`,
            message: `Story #${i + 1} is missing role or goal.`,
          });
      });
    }
  }

  if (nodeType === "erd") {
    if (!fields.entities || fields.entities.length === 0)
      issues.push({ field: "entities", message: "No entities defined." });
  }

  return issues;
}

export async function crossValidateAll(projectId: string): Promise<void> {
  const nodes = await db.nodes.where({ project_id: projectId }).toArray();
  const contents = await db.nodeContents
    .where("node_id")
    .anyOf(nodes.map((n) => n.id))
    .toArray();

  const warnings: Omit<ValidationWarning, "id">[] = [];

  const getFields = (type: string) => {
    const node = nodes.find((n) => n.type === type);
    if (!node) return null;
    const content = contents.find((c) => c.node_id === node.id);
    return { node, fields: content?.structured_fields || {} };
  };

  const brief = getFields("project_brief");
  const reqs = getFields("requirements");
  const stories = getFields("user_stories");
  const useCases = getFields("use_cases");
  const erd = getFields("erd");
  const dfd = getFields("dfd");
  const flowchart = getFields("flowchart");
  const sequence = getFields("sequence");
  const taskBoard = getFields("task_board");

  // Helper arrays
  const frItems = (reqs?.fields.items || []).filter(
    (i: any) => (i.type || "FR") === "FR",
  );
  const storyItems = stories?.fields.items || [];
  const ucItems = useCases?.fields.useCases || [];
  const erdEntities = erd?.fields.entities || [];
  const erdRels = erd?.fields.relationships || [];
  const dfdNodes = dfd?.fields.nodes || [];
  const dfdStores = dfdNodes.filter((n: any) => n.type === "datastore");
  const dfdExtEntities = dfdNodes.filter((n: any) => n.type === "entity");
  const dfdProcesses = dfdNodes.filter((n: any) => n.type === "process");
  const flowchartFlows = flowchart?.fields.flows || [];
  const seqParticipants = sequence?.fields.participants || [];

  // Existing tasks for CV-16/17
  const allTasks = taskBoard
    ? await db.tasks.where({ project_id: projectId }).toArray()
    : [];

  // Rule 1: No Requirements
  if (reqs && (!reqs.fields.items || reqs.fields.items.length === 0)) {
    warnings.push({
      project_id: projectId,
      source_node_id: reqs.node.id,
      target_node_type: "project_brief",
      rule_id: "REQ-EMPTY",
      severity: "error",
      message: "No requirements have been defined for the project.",
    });
  }

  // CV-01: Target user has no stories
  if (brief && brief.fields.target_users?.length > 0 && stories) {
    const storyRoles = storyItems.map((st: any) =>
      (st.role || "").toLowerCase(),
    );
    brief.fields.target_users.forEach((user: string) => {
      if (user && !storyRoles.includes(user.toLowerCase())) {
        warnings.push({
          project_id: projectId,
          source_node_id: brief.node.id,
          target_node_type: "user_stories",
          rule_id: "CV-01",
          severity: "warning",
          message: `Target user "${user}" has no user stories.`,
        });
      }
    });
  }

  // CV-02: Target user not in any use case
  if (brief && brief.fields.target_users?.length > 0 && useCases) {
    const ucActors = (useCases.fields.actors || []).map((a: string) =>
      (a || "").toLowerCase(),
    );
    brief.fields.target_users.forEach((user: string) => {
      if (user && !ucActors.includes(user.toLowerCase())) {
        warnings.push({
          project_id: projectId,
          source_node_id: brief.node.id,
          target_node_type: "use_cases",
          rule_id: "CV-02",
          severity: "warning",
          message: `Target user "${user}" is not in any use case.`,
        });
      }
    });
  }

  // CV-03: Scope item has no requirements
  if (brief && brief.fields.scope_in?.length > 0 && reqs) {
    const coveredScopes = new Set(
      frItems
        .map((i: any) => (i.related_scope || "").toLowerCase())
        .filter(Boolean),
    );
    brief.fields.scope_in.forEach((scope: string) => {
      if (scope && !coveredScopes.has(scope.toLowerCase())) {
        warnings.push({
          project_id: projectId,
          source_node_id: brief.node.id,
          target_node_type: "requirements",
          rule_id: "CV-03",
          severity: "warning",
          message: `Scope item "${scope}" has no linked functional requirement.`,
        });
      }
    });
  }

  // CV-04: FR has no user story
  if (reqs && stories) {
    const storyReqs = new Set(
      storyItems
        .map((s: any) => (s.related_requirement || "").toLowerCase())
        .filter(Boolean),
    );
    frItems.forEach((fr: any, idx: number) => {
      const frId = `FR-${String(idx + 1).padStart(3, "0")}`;
      if (
        !storyReqs.has(fr.id?.toLowerCase()) &&
        !storyReqs.has(frId.toLowerCase())
      ) {
        warnings.push({
          project_id: projectId,
          source_node_id: reqs.node.id,
          target_node_type: "user_stories",
          rule_id: "CV-04",
          severity: "warning",
          message: `${frId} "${(fr.description || "").slice(0, 50)}" has no user story.`,
        });
      }
    });
  }

  // CV-05: User Story has no use case
  if (stories && useCases && ucItems.length > 0) {
    const ucRelatedStories = new Set<string>();
    ucItems.forEach((uc: any) => {
      const relatedStories = (uc.related_user_stories ||
        uc.related_stories ||
        []) as string[];
      relatedStories.forEach((storyId: string) =>
        ucRelatedStories.add(storyId),
      );
    });
    storyItems.forEach((st: any, idx: number) => {
      const storyId = st.id || "";
      if (storyId && !ucRelatedStories.has(storyId)) {
        warnings.push({
          project_id: projectId,
          source_node_id: stories.node.id,
          target_node_type: "use_cases",
          rule_id: "CV-05",
          severity: "warning",
          message: `US-${String(idx + 1).padStart(3, "0")} "${(st.goal || "").slice(0, 40)}" has no use case.`,
        });
      }
    });
  }

  // CV-06: Use Case has no flowchart
  if (useCases && flowchart && ucItems.length > 0) {
    const flowRelatedUCs = new Set(
      flowchartFlows.map((f: any) => f.related_use_case).filter(Boolean),
    );
    ucItems.forEach((uc: any, idx: number) => {
      if (uc.id && !flowRelatedUCs.has(uc.id)) {
        warnings.push({
          project_id: projectId,
          source_node_id: useCases.node.id,
          target_node_type: "flowchart",
          rule_id: "CV-06",
          severity: "warning",
          message: `UC-${String(idx + 1).padStart(3, "0")} "${(uc.name || "").slice(0, 40)}" has no flowchart.`,
        });
      }
    });
  }

  // CV-07: Use Case has no sequence diagram
  if (useCases && sequence && ucItems.length > 0) {
    const seqRelatedUC = sequence.fields.related_use_case || "";
    ucItems.forEach((uc: any, idx: number) => {
      if (uc.id && uc.id !== seqRelatedUC) {
        warnings.push({
          project_id: projectId,
          source_node_id: useCases.node.id,
          target_node_type: "sequence",
          rule_id: "CV-07",
          severity: "warning",
          message: `UC-${String(idx + 1).padStart(3, "0")} "${(uc.name || "").slice(0, 40)}" has no sequence diagram.`,
        });
      }
    });
  }

  // CV-08: DFD data store has no matching ERD entity
  if (erd && dfd) {
    const erdNames = erdEntities.map((e: any) => (e.name || "").toLowerCase());
    dfdStores.forEach((n: any) => {
      const label = (n.label || "").toLowerCase();
      if (label && !erdNames.includes(label)) {
        warnings.push({
          project_id: projectId,
          source_node_id: dfd.node.id,
          target_node_type: "erd",
          rule_id: "CV-08",
          severity: "warning",
          message: `Data store "${n.label}" in DFD has no matching ERD entity.`,
        });
      }
    });
  }

  // CV-09: DFD external entity not in Brief target users
  if (dfd && brief && brief.fields.target_users?.length > 0) {
    const targetUsersLower = brief.fields.target_users.map((u: string) =>
      u.toLowerCase(),
    );
    dfdExtEntities.forEach((n: any) => {
      const label = (n.label || "").toLowerCase();
      if (label && !targetUsersLower.includes(label)) {
        warnings.push({
          project_id: projectId,
          source_node_id: dfd.node.id,
          target_node_type: "project_brief",
          rule_id: "CV-09",
          severity: "warning",
          message: `DFD external entity "${n.label}" is not in Brief target users.`,
        });
      }
    });
  }

  // CV-10: DFD process has no related use case
  if (dfd && useCases && ucItems.length > 0) {
    dfdProcesses.forEach((n: any) => {
      const relatedUseCase = n.related_use_case || n.related_uc;
      if (n.label && !relatedUseCase) {
        warnings.push({
          project_id: projectId,
          source_node_id: dfd.node.id,
          target_node_type: "use_cases",
          rule_id: "CV-10",
          severity: "warning",
          message: `DFD process "${n.label}" has no related use case.`,
        });
      }
    });
  }

  // CV-11: ERD entity has no matching DFD data store
  if (erd && dfd && erdEntities.length > 0) {
    const storeNames = dfdStores.map((n: any) => (n.label || "").toLowerCase());
    erdEntities.forEach((e: any) => {
      const name = (e.name || "").toLowerCase();
      if (name && !storeNames.includes(name)) {
        warnings.push({
          project_id: projectId,
          source_node_id: erd.node.id,
          target_node_type: "dfd",
          rule_id: "CV-11",
          severity: "warning",
          message: `ERD entity "${e.name}" has no matching DFD data store.`,
        });
      }
    });
  }

  // CV-12: ERD entity not referenced in User Stories or Use Cases
  if (erd && erdEntities.length > 0 && (stories || useCases)) {
    const allText = [
      ...storyItems.map((s: any) => `${s.goal || ""} ${s.benefit || ""}`),
      ...ucItems.map(
        (uc: any) =>
          `${uc.name || ""} ${(uc.main_flow || []).map((s: any) => s.action || "").join(" ")}`,
      ),
    ]
      .join(" ")
      .toLowerCase();
    erdEntities.forEach((e: any) => {
      const name = (e.name || "").toLowerCase();
      if (name && !allText.includes(name)) {
        warnings.push({
          project_id: projectId,
          source_node_id: erd.node.id,
          target_node_type: "user_stories",
          rule_id: "CV-12",
          severity: "info",
          message: `ERD entity "${e.name}" is not referenced in any user story or use case.`,
        });
      }
    });
  }

  // CV-13: ERD entity is orphan (no relationships)
  if (erd && erdEntities.length > 1) {
    const relEntities = new Set<string>();
    erdRels.forEach((r: any) => {
      if (r.from) relEntities.add(r.from.toLowerCase());
      if (r.to) relEntities.add(r.to.toLowerCase());
    });
    erdEntities.forEach((e: any) => {
      const name = (e.name || "").toLowerCase();
      if (name && !relEntities.has(name)) {
        warnings.push({
          project_id: projectId,
          source_node_id: erd.node.id,
          target_node_type: "erd",
          rule_id: "CV-13",
          severity: "warning",
          message: `ERD entity "${e.name}" has no relationships (orphan).`,
        });
      }
    });
  }

  // CV-14: Sequence DB participant has no matching ERD entity
  if (sequence && erd) {
    const erdNames = erdEntities.map((e: any) => (e.name || "").toLowerCase());
    seqParticipants.forEach((p: any) => {
      const name = (typeof p === "string" ? p : p?.name || "").toLowerCase();
      const type = typeof p === "string" ? "component" : p?.type || "component";
      if (type === "database" && name && !erdNames.includes(name)) {
        warnings.push({
          project_id: projectId,
          source_node_id: sequence.node.id,
          target_node_type: "erd",
          rule_id: "CV-14",
          severity: "warning",
          message: `Sequence participant "${name}" (database) has no matching ERD entity.`,
        });
      }
    });
  }

  // CV-15: Sequence external participant not in DFD external entities
  if (sequence && dfd) {
    const dfdExtNames = dfdExtEntities.map((n: any) =>
      (n.label || "").toLowerCase(),
    );
    seqParticipants.forEach((p: any) => {
      const name = (typeof p === "string" ? p : p?.name || "").toLowerCase();
      const type = typeof p === "string" ? "component" : p?.type || "component";
      if (type === "external" && name && !dfdExtNames.includes(name)) {
        warnings.push({
          project_id: projectId,
          source_node_id: sequence.node.id,
          target_node_type: "dfd",
          rule_id: "CV-15",
          severity: "warning",
          message: `Sequence participant "${name}" (external) is not in DFD external entities.`,
        });
      }
    });
  }

  // CV-16: User Story has no generated tasks
  if (stories && storyItems.length > 0 && allTasks.length > 0) {
    const taskSources = new Set(
      allTasks.map((t) => t.source_item_id).filter(Boolean),
    );
    storyItems.forEach((_st: any, idx: number) => {
      if (!taskSources.has(`story-${idx}-impl`)) {
        warnings.push({
          project_id: projectId,
          source_node_id: stories.node.id,
          target_node_type: "task_board",
          rule_id: "CV-16",
          severity: "info",
          message: `US-${String(idx + 1).padStart(3, "0")} has no generated tasks. Open Task Board to sync.`,
        });
      }
    });
  }

  // CV-17: ERD entity has no database task
  if (erd && erdEntities.length > 0 && allTasks.length > 0) {
    const taskSources = new Set(
      allTasks.map((t) => t.source_item_id).filter(Boolean),
    );
    erdEntities.forEach((e: any) => {
      const name = (e.name || "").toLowerCase();
      if (name && !taskSources.has(`erd-migration-${name}`)) {
        warnings.push({
          project_id: projectId,
          source_node_id: erd.node.id,
          target_node_type: "task_board",
          rule_id: "CV-17",
          severity: "info",
          message: `Entity "${e.name}" has no migration task. Open Task Board to sync.`,
        });
      }
    });
  }

  // CV-18: Use Case include/extend references non-existent UC
  if (useCases && ucItems.length > 0) {
    const ucIds = new Set(ucItems.map((uc: any) => uc.id));
    ucItems.forEach((uc: any, idx: number) => {
      const includeExtend = (uc.include_extend ||
        uc.relationships ||
        []) as any[];
      includeExtend.forEach((rel: any) => {
        const targetUc = rel.target_uc || rel.target;
        if (targetUc && !ucIds.has(targetUc)) {
          warnings.push({
            project_id: projectId,
            source_node_id: useCases.node.id,
            target_node_type: "use_cases",
            rule_id: "CV-18",
            severity: "error",
            message: `UC-${String(idx + 1).padStart(3, "0")} "${uc.name}" has ${rel.type || "include"} reference to non-existent use case.`,
          });
        }
      });
    });
  }

  // Clear old and insert new
  await db.transaction("rw", db.validationWarnings, async () => {
    await db.validationWarnings.where({ project_id: projectId }).delete();

    for (const w of warnings) {
      await db.validationWarnings.add({
        ...w,
        id: crypto.randomUUID(),
      });
    }
  });
}
