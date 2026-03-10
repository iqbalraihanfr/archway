/* eslint-disable @typescript-eslint/no-explicit-any */
import { TaskData, NodeData, NodeContent, Project } from "./db";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

// Utility to trigger a download
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTasksToJSON(tasks: TaskData[], projectName: string) {
  const data = JSON.stringify(tasks, null, 2);
  downloadFile(data, `${projectName}-tasks.json`, "application/json");
}

export function exportTasksToCSV(tasks: TaskData[], projectName: string) {
  const headers = [
    "ID",
    "Title",
    "Description",
    "Priority",
    "Is Manual",
    "Source Group",
  ];
  const rows = tasks.map((t) => [
    t.id,
    `"${t.title.replace(/"/g, '""')}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    t.priority,
    t.is_manual ? "Yes" : "No",
    `"${t.group_key.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
  downloadFile(csvContent, `${projectName}-tasks.csv`, "text/csv");
}

export function exportTasksToLinearCSV(tasks: TaskData[], projectName: string) {
  // Linear CSV format typically requires: Title, Description, Priority
  // We can loosely map priority strings to 0-4 if needed, but Linear often auto-maps text too.
  const headers = ["Title", "Description", "Priority", "Labels"];
  const rows = tasks.map((t) => [
    `"${t.title.replace(/"/g, '""')}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    t.priority,
    `"Archway,${t.group_key.replace(/"/g, '""')}"`, // Add Archway label
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
  downloadFile(csvContent, `${projectName}-linear-import.csv`, "text/csv");
}

export function exportTasksToMarkdown(tasks: TaskData[], projectName: string) {
  let md = `# ${projectName} - Task List\n\n`;

  // Group tasks by their group_key for nicer output
  const grouped: Record<string, TaskData[]> = {};
  tasks.forEach((t) => {
    if (!grouped[t.group_key]) grouped[t.group_key] = [];
    grouped[t.group_key].push(t);
  });

  for (const [group, groupTasks] of Object.entries(grouped)) {
    md += `## ${group}\n\n`;
    for (const task of groupTasks) {
      md += `- [ ] **${task.title}**\n`;
      if (task.description) {
        md += `  > ${task.description.split("\n").join("\n  > ")}\n`;
      }
      md += `  *Priority: ${task.priority}*\n\n`;
    }
  }

  downloadFile(md, `${projectName}-tasks.md`, "text/markdown");
}

export async function exportDiagramToPNG(
  htmlElement: HTMLElement,
  title: string,
) {
  try {
    const dataUrl = await toPng(htmlElement, {
      quality: 1,
      backgroundColor: "#ffffff",
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${title}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Failed to export diagram to PNG", err);
    alert("Failed to export diagram");
  }
}

// Helper to concatenate all text content for Markdown Project Export
export function compileProjectToMarkdown(
  project: Project,
  nodes: NodeData[],
  contents: NodeContent[],
) {
  let md = `# ${project.name}\n\n`;
  if (project.description) md += `${project.description}\n\n`;

  const sortedNodes = nodes
    .filter((n) => n.type !== "summary" && n.type !== "task_board")
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const node of sortedNodes) {
    const c = contents.find((cont) => cont.node_id === node.id);
    if (!c) continue;

    md += `---\n\n## ${node.label} (${node.type})\n\n`;

    if (node.type === "project_brief" && c.structured_fields) {
      const sf = c.structured_fields;
      if (sf.name) md += `**Project Name:** ${sf.name}\n\n`;
      if (sf.background) md += `**Background / Why:** ${sf.background}\n\n`;
      if (sf.objectives?.length)
        md += `**Objectives:**\n${sf.objectives.map((o: string) => `- ${o}`).join("\n")}\n\n`;
      if (sf.target_users?.length)
        md += `**Target Users:** ${sf.target_users.join(", ")}\n\n`;
      if (sf.scope_in?.length)
        md += `**Scope In:**\n${sf.scope_in.map((s: string) => `- ${s}`).join("\n")}\n\n`;
      if (sf.scope_out?.length)
        md += `**Scope Out:**\n${sf.scope_out.map((s: string) => `- ${s}`).join("\n")}\n\n`;
      if (sf.success_metrics?.length)
        md += `**Success Metrics:**\n${sf.success_metrics.map((m: any) => `- ${m.metric}: ${m.target}`).join("\n")}\n\n`;
      if (sf.constraints?.length)
        md += `**Constraints:**\n${sf.constraints.map((c: string) => `- ${c}`).join("\n")}\n\n`;
      if (sf.tech_stack?.length)
        md += `**Tech Stack:** ${sf.tech_stack.join(", ")}\n\n`;
      if (sf.references?.length)
        md += `**References:**\n${sf.references.map((r: any) => `- [${r.name}](${r.url})`).join("\n")}\n\n`;
    }

    if (node.type === "requirements" && c.structured_fields?.items) {
      c.structured_fields.items.forEach((item: any) => {
        md += `- [${item.priority}] ${item.description}\n`;
      });
      md += "\n";
    }

    if (node.type === "user_stories" && c.structured_fields?.items) {
      c.structured_fields.items.forEach((item: any) => {
        md += `- **As a** ${item.role}, **I want** ${item.goal}, **so that** ${item.benefit}\n`;
      });
      md += "\n";
    }

    if (node.type === "erd" && c.structured_fields?.sql) {
      md += `### Schema SQL\n\n\`\`\`sql\n${c.structured_fields.sql}\n\`\`\`\n\n`;
    }

    if (node.type === "use_cases" && c.structured_fields?.useCases) {
      c.structured_fields.useCases.forEach((uc: any, idx: number) => {
        const actors = [
          uc.primary_actor,
          ...((uc.secondary_actors as string[]) || []),
        ].filter(Boolean);

        md += `### UC-${String(idx + 1).padStart(3, "0")} ${uc.name || "Untitled"}\n`;
        md += `- **Actors:** ${actors.length > 0 ? actors.join(", ") : "System"}\n`;
        if (uc.description) md += `- **Description:** ${uc.description}\n`;
        md += "\n";
      });
    }

    if (c.structured_fields?.notes) {
      md += `### Notes\n\n${c.structured_fields.notes}\n\n`;
    }

    const syntax = c.mermaid_manual || c.mermaid_auto;
    if (syntax) {
      // Use standard markdown code blocks for mermaid
      md += "```mermaid\n";
      md += syntax;
      md += "\n```\n\n";
    }
  }

  return md;
}

export function exportProjectToMarkdown(
  project: Project,
  nodes: NodeData[],
  contents: NodeContent[],
) {
  const md = compileProjectToMarkdown(project, nodes, contents);
  downloadFile(md, `${project.name}-Documentation.md`, "text/markdown");
}

export function exportProjectToPDF(
  project: Project,
  nodes: NodeData[],
  contents: NodeContent[],
) {
  const md = compileProjectToMarkdown(project, nodes, contents);
  const pdf = new jsPDF("p", "pt", "a4");

  // Basic rendering of Markdown as text to PDF. A robust version would render HTML first.
  const lines = pdf.splitTextToSize(md, 500);
  let y = 40;
  for (let i = 0; i < lines.length; i++) {
    if (y > 780) {
      pdf.addPage();
      y = 40;
    }
    pdf.text(lines[i], 40, y);
    y += 14;
  }

  pdf.save(`${project.name}-Documentation.pdf`);
}
