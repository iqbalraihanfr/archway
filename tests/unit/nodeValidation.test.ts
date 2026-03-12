import { expect, test, describe } from "vitest";
import { validateNode } from "../../src/lib/nodeValidation";

describe("Node Validation Engine", () => {
  describe("Project Brief Validation", () => {
    test("should return issues for empty fields", () => {
      const input = {};
      const issues = validateNode("project_brief", input);
      expect(issues.some(i => i.field === "name")).toBe(true);
      expect(issues.some(i => i.field === "background")).toBe(true);
      expect(issues.some(i => i.field === "objectives")).toBe(true);
    });

    test("should return no issues for valid brief", () => {
      const input = {
        name: "Test Project",
        background: "A background",
        objectives: ["Obj 1"],
        target_users: ["User 1"],
        scope_in: ["Scope 1"],
        scope_out: ["Scope 2"],
        success_metrics: ["Metric 1"]
      };
      const issues = validateNode("project_brief", input);
      expect(issues.length).toBe(0);
    });
  });

  describe("Requirements Validation", () => {
    test("should enforce minimum requirements and priority", () => {
      const input = {
        items: [
          { type: "FR", priority: "Must" },
          { type: "FR", priority: "Should" }
        ]
      };
      const issues = validateNode("requirements", input);
      expect(issues.some(i => i.message.includes("Min 3 Functional Requirements"))).toBe(true);
      expect(issues.some(i => i.message.includes("At least 1 Non-Functional Requirement"))).toBe(true);
    });

    test("should pass with valid requirements", () => {
      const input = {
        items: [
          { type: "FR", priority: "Must" },
          { type: "FR" },
          { type: "FR" },
          { type: "NFR" }
        ]
      };
      const issues = validateNode("requirements", input);
      expect(issues.length).toBe(0);
    });
  });

  describe("User Stories Validation", () => {
    test("should validate missing role/goal", () => {
      const input = {
        items: [
          { role: "User", goal: "Action" },
          { role: "", goal: "" }
        ]
      };
      const issues = validateNode("user_stories", input);
      expect(issues.length).toBe(1);
      expect(issues[0].message).toContain("Story #2");
    });
  });
});
