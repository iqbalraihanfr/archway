import { expect, test, describe } from "vitest";
import { generateERDMermaid } from "../../src/lib/diagramGenerators/erd";

describe("ERD Diagram Generator", () => {
  test("should generate empty ERD with placeholder when no entities", () => {
    const input = { entities: [], relationships: [] };
    const output = generateERDMermaid(input);
    expect(output).toBe("erDiagram\n  ENTITY {}");
  });

  test("should generate basic entity with attributes", () => {
    const input = {
      entities: [
        {
          id: "user-1",
          name: "User",
          attributes: [
            { name: "id", type: "uuid", isPrimaryKey: true },
            { name: "email", type: "string" },
            { name: "group_id", type: "uuid", isForeignKey: true }
          ]
        }
      ],
      relationships: []
    };
    const output = generateERDMermaid(input);
    expect(output).toContain("erDiagram");
    expect(output).toContain("User {");
    expect(output).toContain("uuid id PK");
    expect(output).toContain("string email");
    expect(output).toContain("uuid group_id FK");
  });

  test("should handle relationships between entities", () => {
    const input = {
      entities: [
        { id: "u1", name: "User" },
        { id: "p1", name: "Profile" }
      ],
      relationships: [
        { from: "User", to: "Profile", type: "one-to-one" }
      ]
    };
    const output = generateERDMermaid(input);
    expect(output).toContain("User ||--|| Profile : \" \"");
  });

  test("should handle complex relationships and default labels", () => {
    const input = {
      entities: [
        { id: "u1", name: "User" },
        { id: "t1", name: "Task" }
      ],
      relationships: [
        { from: "User", to: "Task", type: "one-to-many" }
      ]
    };
    const output = generateERDMermaid(input);
    expect(output).toContain("User ||--o{ Task : \" \"");
  });
});
