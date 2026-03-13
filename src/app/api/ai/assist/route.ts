import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/ai/model";

type AssistContext = Record<string, unknown>;

const SECTION_PROMPTS: Record<string, (ctx: AssistContext) => string> = {
  objectives: (ctx) =>
    `Project: ${ctx.name || "Unknown"}
Background: ${ctx.background || "Not provided"}
Target Users: ${JSON.stringify(ctx.target_users || [])}

Generate 3–5 clear, actionable project objectives. Each should be a concrete goal the project will achieve.
Return ONLY a JSON array of strings.`,

  target_users: (ctx) =>
    `Project: ${ctx.name || "Unknown"}
Background: ${ctx.background || "Not provided"}
Objectives: ${JSON.stringify(ctx.objectives || [])}

Suggest 3–5 relevant user types or personas for this project (e.g. "Admin User", "End Customer", "Operations Manager").
Return ONLY a JSON array of strings.`,

  scope_in: (ctx) =>
    `Project: ${ctx.name || "Unknown"}
Background: ${ctx.background || "Not provided"}
Objectives: ${JSON.stringify(ctx.objectives || [])}
Target Users: ${JSON.stringify(ctx.target_users || [])}
Existing scope items: ${JSON.stringify(ctx.scope_in || [])}

Suggest 4–6 features or capabilities that should be included. Don't repeat existing items.
Return ONLY a JSON array of strings.`,

  scope_out: (ctx) =>
    `Project: ${ctx.name || "Unknown"}
Scope In: ${JSON.stringify(ctx.scope_in || [])}
Objectives: ${JSON.stringify(ctx.objectives || [])}

Suggest 3–5 things that should be explicitly out of scope for this project.
Return ONLY a JSON array of strings.`,

  constraints: (ctx) =>
    `Project: ${ctx.name || "Unknown"}
Background: ${ctx.background || "Not provided"}
Tech Stack: ${JSON.stringify(ctx.tech_stack || [])}
Scope: ${JSON.stringify(ctx.scope_in || [])}

Suggest 3–5 realistic project constraints (budget, timeline, technical, compliance, etc.).
Return ONLY a JSON array of strings.`,

  tech_stack: (ctx) =>
    `Project: ${ctx.name || "Unknown"}
Background: ${ctx.background || "Not provided"}
Objectives: ${JSON.stringify(ctx.objectives || [])}
Scope: ${JSON.stringify(ctx.scope_in || [])}

Suggest a relevant technology stack. Be specific (e.g. "Next.js 15", "PostgreSQL", "Tailwind CSS").
Return ONLY a JSON array of strings.`,
};

export async function POST(req: NextRequest) {
  try {
    const { section, context } = (await req.json()) as {
      section: string;
      context: AssistContext;
    };

    const buildPrompt = SECTION_PROMPTS[section];
    if (!buildPrompt) {
      return NextResponse.json(
        { error: `Unknown section: ${section}` },
        { status: 400 }
      );
    }

    const { text: raw } = await generateText({
      model: getModel(),
      system:
        "You are a business analyst. Return ONLY a valid JSON array of strings. No markdown, no code blocks, no explanation. IMPORTANT: Detect the language from the project context provided and respond in that same language — Indonesian (Bahasa Indonesia) if the context is in Indonesian, English if in English. Support any language.",
      messages: [{ role: "user", content: buildPrompt(context) }],
    });

    const suggestions = JSON.parse(raw.trim()) as string[];
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[assist]", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions. Check your API key." },
      { status: 500 }
    );
  }
}
