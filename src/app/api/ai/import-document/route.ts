import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/ai/model";
import type { ProjectBriefFields } from "@/components/editors/ProjectBriefEditor";

const SYSTEM_PROMPT = `You are a business analyst assistant. Extract structured project brief information from the provided document (quotation, BQ, SOW, or project proposal).

IMPORTANT: Detect the language of the document and respond in that same language. If the document is in Indonesian (Bahasa Indonesia), write all extracted text values in Indonesian. If in English, use English. Support any language.

Return ONLY a valid JSON object with exactly these fields:
{
  "name": "project name (string)",
  "background": "why this project exists, what problem it solves (max 300 chars)",
  "objectives": ["actionable goal 1", "actionable goal 2"],
  "target_users": ["User Type 1", "User Type 2"],
  "scope_in": ["feature or capability 1", "feature or capability 2"],
  "scope_out": ["excluded item 1"],
  "success_metrics": [{"metric": "metric name", "target": "concrete target value"}],
  "constraints": ["constraint 1"],
  "tech_stack": ["Technology 1"],
  "references": []
}

Rules:
- objectives: 3–6 clear, actionable goals
- target_users: user types or personas who will use the system
- scope_in: features/capabilities that WILL be built
- scope_out: things explicitly excluded or clearly out of scope
- success_metrics: measurable outcomes with concrete targets (e.g., {"metric": "Page load time", "target": "< 2s"})
- Keep background under 300 characters
- Use empty arrays [] for fields with no relevant info
- Return ONLY valid JSON — no markdown, no code blocks, no explanation`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      text?: string;
      fileBase64?: string;
      mimeType?: string;
    };

    if (!body.text && !body.fileBase64) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      );
    }

    const content = body.fileBase64
      ? [
          {
            type: "file" as const,
            data: body.fileBase64,
            mediaType: (body.mimeType ?? "application/pdf") as "application/pdf",
          },
          {
            type: "text" as const,
            text: "Extract the project brief information from this document.",
          },
        ]
      : `Extract project brief information from this document:\n\n${body.text}`;

    const { text: raw } = await generateText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const fields = JSON.parse(raw.trim()) as ProjectBriefFields;
    return NextResponse.json({ fields });
  } catch (err) {
    console.error("[import-document]", err);
    return NextResponse.json(
      { error: "Failed to extract document. Check your API key and try again." },
      { status: 500 }
    );
  }
}
