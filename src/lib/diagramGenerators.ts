/* eslint-disable @typescript-eslint/no-explicit-any */
export function generateMermaid(
  nodeType: string,
  fields: Record<string, any>,
): string {
  try {
    switch (nodeType) {
      case "use_cases":
        return generateUseCaseMermaid(fields);
      case "erd":
        return generateERDMermaid(fields);
      case "sequence":
        return generateSequenceMermaid(fields);
      case "flowchart":
        return generateFlowchartMermaid(fields);
      case "dfd":
        return generateDFDMermaid(fields);
      case "project_brief":
        return "mindmap\n  root((Project))\n    Background\n    Scope\n    Metrics";
      case "requirements":
        return "mindmap\n  root((Requirements))\n    Functional\n    NonFunctional";
      case "user_stories":
        return "mindmap\n  root((User Stories))";
      default:
        return "";
    }
  } catch (e) {
    console.error("Failed to generate mermaid for", nodeType, e);
    return "";
  }
}

function generateUseCaseMermaid(fields: any): string {
  const actors = fields.actors || [];
  const useCases = fields.useCases || [];

  if (actors.length === 0 && useCases.length === 0)
    return "flowchart TD\n  Start(Start)";

  let m = "flowchart LR\n";

  // actors are left-side nodes
  actors.forEach((a: string, i: number) => {
    m += `  actor_${i}(["${a}"])\n`;
  });

  // use cases
  useCases.forEach((uc: any, i: number) => {
    const ucId = `uc_${i}`;
    m += `  ${ucId}(("${uc.name}"))\n`;

    // link primary actor
    if (uc.primary_actor) {
      const idx = actors.indexOf(uc.primary_actor);
      if (idx !== -1) {
        m += `  actor_${idx} --> ${ucId}\n`;
      }
    }
  });

  return m;
}

function generateERDMermaid(fields: any): string {
  const entities = fields.entities || [];
  const rels = fields.relationships || [];

  if (entities.length === 0) return "erDiagram\n  ENTITY {}";

  let m = "erDiagram\n";

  entities.forEach((ent: any) => {
    const name = ent.name || `Unnamed_${ent.id.substring(0, 4)}`;
    m += `  ${name} {\n`;
    (ent.attributes || []).forEach((attr: any) => {
      const type = attr.type ? attr.type.replace(/\s+/g, "_") : "string";
      const attrName = attr.name ? attr.name.replace(/\s+/g, "_") : "col";
      let pkfk = "";
      if (attr.isPrimaryKey && attr.isForeignKey) pkfk = " PK,FK";
      else if (attr.isPrimaryKey) pkfk = " PK";
      else if (attr.isForeignKey) pkfk = " FK";
      m += `    ${type} ${attrName}${pkfk}\n`;
    });
    m += `  }\n`;
  });

  rels.forEach((rel: any) => {
    if (!rel.from || !rel.to) return;
    const t = rel.type || "one-to-many";
    let relStr = "||--o{";
    if (t === "one-to-one") relStr = "||--||";
    if (t === "many-to-many") relStr = "}o--o{";
    m += `  ${rel.from} ${relStr} ${rel.to} : " "\n`;
  });

  return m;
}

function generateSequenceMermaid(fields: any): string {
  const participants = fields.participants || [];
  const msgs = fields.messages || [];

  if (participants.length === 0) return "sequenceDiagram\n  participant System";

  let m = "sequenceDiagram\n";
  participants.forEach((p: any) => {
    const name = typeof p === "string" ? p : p?.name || "Unknown";
    const type = typeof p === "string" ? "component" : p?.type || "component";
    const safeName = name.replace(/\s+/g, "_");
    if (type === "actor") m += `  actor ${safeName} as ${name}\n`;
    else m += `  participant ${safeName} as ${name}\n`;
  });

  // Group tracking for alt/opt/loop
  let currentGroup: string | null = null;
  msgs.forEach((msg: any) => {
    if (!msg.from || !msg.to) return;
    const f = msg.from.replace(/\s+/g, "_");
    const t = msg.to.replace(/\s+/g, "_");
    const group = msg.group || "none";

    // Handle group transitions
    if (group !== "none" && group !== currentGroup) {
      if (currentGroup) m += `  end\n`;
      m += `  ${group} ${msg.group_label || group}\n`;
      currentGroup = group;
    } else if (group === "none" && currentGroup) {
      m += `  end\n`;
      currentGroup = null;
    }

    const msgType = msg.type || "request";
    if (msgType === "response") {
      m += `  ${f}-->>-${t}: ${msg.content || "return"}\n`;
    } else if (msgType === "self") {
      m += `  ${f}->>+${f}: ${msg.content || "self call"}\n`;
    } else {
      m += `  ${f}->>+${t}: ${msg.content || "call"}\n`;
    }
  });
  if (currentGroup) m += `  end\n`;

  return m;
}

function generateFlowchartMermaid(fields: any): string {
  // Support new multi-flow format and legacy flat format
  const flows = fields.flows || [];
  const legacySteps = fields.steps || [];
  const legacyConns = fields.connections || [];

  if (flows.length === 0 && legacySteps.length === 0)
    return "flowchart TD\n  Start(Start)";

  let m = "flowchart TD\n";

  const renderStepsAndConns = (steps: any[], conns: any[]) => {
    steps.forEach((s: any) => {
      const id = s.id.split("-")[0];
      const lbl = s.label || id;
      if (s.type === "decision") m += `  ${id}{"${lbl}"}\n`;
      else if (s.type === "start" || s.type === "end")
        m += `  ${id}(["${lbl}"])\n`;
      else m += `  ${id}["${lbl}"]\n`;
    });
    conns.forEach((c: any) => {
      if (!c.from || !c.to) return;
      const fromId = c.from.split("-")[0];
      const toId = c.to.split("-")[0];
      if (c.label) m += `  ${fromId} -- "${c.label}" --> ${toId}\n`;
      else m += `  ${fromId} --> ${toId}\n`;
    });
  };

  if (flows.length > 0) {
    flows.forEach((flow: any, idx: number) => {
      if (flows.length > 1)
        m += `  subgraph ${flow.name || `Flow_${idx + 1}`}\n`;
      renderStepsAndConns(flow.steps || [], flow.connections || []);
      if (flows.length > 1) m += `  end\n`;
    });
  } else {
    renderStepsAndConns(legacySteps, legacyConns);
  }

  return m;
}

function generateDFDMermaid(fields: any): string {
  const nodes = fields.nodes || [];
  const flows = fields.flows || [];

  if (nodes.length === 0) return "flowchart TD\n  System((System))";

  let m = "flowchart TD\n";

  nodes.forEach((n: any) => {
    const id = n.id.split("-")[0];
    const lbl = n.label || id;
    if (n.type === "entity") m += `  ${id}["${lbl}"]\n`;
    else if (n.type === "datastore") m += `  ${id}[("${lbl}")]\n`;
    else m += `  ${id}(("${lbl}"))\n`;
  });

  flows.forEach((f: any) => {
    if (!f.from || !f.to) return;
    const fromId = f.from.split("-")[0];
    const toId = f.to.split("-")[0];
    if (f.label) m += `  ${fromId} -- "${f.label}" --> ${toId}\n`;
    else m += `  ${fromId} --> ${toId}\n`;
  });

  return m;
}
