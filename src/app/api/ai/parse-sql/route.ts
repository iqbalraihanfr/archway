import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/ai/model";
import type { ERDFields } from "@/components/editors/erd/hooks/useERDLogic";

const SYSTEM_PROMPT = `You are a database architect. Parse the provided SQL CREATE TABLE statements and extract the schema into structured ERD format.

Return ONLY a valid JSON object with this exact structure:
{
  "entities": [
    {
      "id": "abc12345",
      "name": "ENTITY_NAME",
      "description": "",
      "attributes": [
        {
          "name": "column_name",
          "type": "VARCHAR|INT|TEXT|BOOLEAN|TIMESTAMP|DECIMAL|UUID|etc",
          "isPrimaryKey": false,
          "isForeignKey": false,
          "isUnique": false,
          "isNullable": true,
          "isRequired": false,
          "isIndex": false,
          "description": ""
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "def67890",
      "from": "TABLE_A",
      "to": "TABLE_B",
      "type": "one-to-many",
      "label": "has"
    }
  ]
}

Rules:
- Entity names MUST be UPPERCASE (e.g. USERS, ORDERS, PRODUCTS)
- Attribute names must be snake_case
- Infer relationships from FOREIGN KEY constraints and column naming patterns (e.g. user_id → FK to USERS)
- Relationship types: "one-to-one", "one-to-many", "many-to-one", "many-to-many"
- Use "one-to-many" as default for FK relationships unless context clearly suggests otherwise
- Generate 8-char alphanumeric ids (e.g. "a1b2c3d4")
- If no SQL is provided or it's invalid, return { "entities": [], "relationships": [] }
- Return ONLY valid JSON — no markdown, no code blocks, no explanation`;

export async function POST(req: NextRequest) {
  try {
    const { sql } = (await req.json()) as { sql?: string };

    if (!sql?.trim()) {
      return NextResponse.json(
        { error: "No SQL provided" },
        { status: 400 }
      );
    }

    const { text: raw } = await generateText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this SQL schema into ERD format:\n\n${sql}`,
        },
      ],
    });

    const fields = JSON.parse(raw.trim()) as ERDFields;
    return NextResponse.json({ fields });
  } catch (err) {
    console.error("[parse-sql]", err);
    return NextResponse.json(
      { error: "Failed to parse SQL. Check your API key and try again." },
      { status: 500 }
    );
  }
}
