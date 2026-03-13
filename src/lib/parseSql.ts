import { Parser } from "node-sql-parser";
import type {
  Create,
  CreateColumnDefinition,
  CreateConstraintForeign,
  CreateConstraintPrimary,
  ColumnRefItem,
} from "node-sql-parser";
import type {
  ERDFields,
  ERDAttribute,
} from "@/components/editors/erd/hooks/useERDLogic";

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getColumnName(col: unknown): string {
  const c = col as ColumnRefItem;
  if (!c) return "";
  if (typeof c.column === "string") return c.column;
  return (c.column as { expr?: { value?: string } })?.expr?.value ?? "";
}

function getTableName(table: unknown): string {
  if (!table) return "";
  if (Array.isArray(table)) return (table[0] as { table?: string })?.table ?? "";
  return (table as { table?: string })?.table ?? "";
}

function getRefTable(refDef: unknown): string {
  if (!refDef) return "";
  const rd = refDef as Record<string, unknown>;
  // ColumnDefinitionOptList wraps it: { reference_definition: { table: ... } }
  const inner = (rd.reference_definition as Record<string, unknown>) ?? rd;
  return getTableName(inner.table);
}

const DIALECTS = ["PostgreSQL", "MySQL", "MariaDB", "Sqlite"] as const;

/**
 * Parse SQL CREATE TABLE statements into ERDFields using node-sql-parser.
 * Tries multiple SQL dialects. Throws if all dialects fail.
 */
export function parseSqlToERD(sql: string): ERDFields {
  const parser = new Parser();

  let ast: ReturnType<typeof parser.astify> | undefined;
  let lastError: Error = new Error("Failed to parse SQL");

  for (const db of DIALECTS) {
    try {
      ast = parser.astify(sql, { database: db });
      break;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (!ast) throw lastError;

  const statements = Array.isArray(ast) ? ast : [ast];
  const entities: NonNullable<ERDFields["entities"]> = [];
  const relationships: NonNullable<ERDFields["relationships"]> = [];

  for (const stmt of statements) {
    if (stmt.type !== "create" || stmt.keyword !== "table") continue;

    const create = stmt as Create;
    const tableName = getTableName(create.table).toUpperCase();
    if (!tableName) continue;

    const attributes: ERDAttribute[] = [];

    for (const def of create.create_definitions ?? []) {
      // ── Regular column ────────────────────────────────────────────────────
      if (def.resource === "column") {
        const colDef = def as CreateColumnDefinition;
        const colName = getColumnName(colDef.column);
        if (!colName) continue;

        const dataType = colDef.definition?.dataType ?? "TEXT";
        const isPrimaryKey = !!colDef.primary;
        const isUnique = !!colDef.unique;
        const isNullable = colDef.nullable?.type !== "not null";
        const hasFKRef = !!colDef.reference_definition;

        attributes.push({
          name: colName,
          type: dataType,
          isPrimaryKey,
          isForeignKey: hasFKRef,
          isUnique,
          isNullable,
          isRequired: !isNullable,
          isIndex: false,
          description: "",
        });

        // Inline REFERENCES clause → relationship
        if (hasFKRef) {
          const refTable = getRefTable(colDef.reference_definition).toUpperCase();
          if (refTable && !relationships.some((r) => r.from === tableName && r.to === refTable)) {
            relationships.push({
              id: shortId(),
              from: tableName,
              to: refTable,
              type: "one-to-many",
              label: "",
            });
          }
        }
      }

      // ── Explicit FOREIGN KEY constraint ───────────────────────────────────
      if ((def as { constraint_type?: string }).constraint_type === "FOREIGN KEY") {
        const fkDef = def as CreateConstraintForeign;
        const fkColName = getColumnName(fkDef.definition?.[0]);

        // Mark matching column attribute as FK
        const attr = attributes.find((a) => a.name === fkColName);
        if (attr) attr.isForeignKey = true;

        const refTable = getRefTable(fkDef.reference_definition).toUpperCase();
        if (refTable && !relationships.some((r) => r.from === tableName && r.to === refTable)) {
          relationships.push({
            id: shortId(),
            from: tableName,
            to: refTable,
            type: "one-to-many",
            label: "",
          });
        }
      }

      // ── Explicit PRIMARY KEY constraint ───────────────────────────────────
      if ((def as { constraint_type?: string }).constraint_type === "primary key") {
        const pkDef = def as CreateConstraintPrimary;
        const pkColName = getColumnName(pkDef.definition?.[0]);
        const attr = attributes.find((a) => a.name === pkColName);
        if (attr) attr.isPrimaryKey = true;
      }
    }

    entities.push({
      id: shortId(),
      name: tableName,
      description: "",
      attributes,
    });
  }

  return { entities, relationships };
}
