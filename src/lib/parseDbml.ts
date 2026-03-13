import { Parser } from "@dbml/core";
import type {
  ERDFields,
  ERDAttribute,
} from "@/components/editors/erd/hooks/useERDLogic";

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type RelType = "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";

function mapRelationType(r1: string, r2: string): RelType {
  if (r1 === "1" && r2 === "*") return "one-to-many";
  if (r1 === "*" && r2 === "1") return "many-to-one";
  if (r1 === "1" && r2 === "1") return "one-to-one";
  if (r1 === "*" && r2 === "*") return "many-to-many";
  return "one-to-many";
}

/**
 * Parse DBML into ERDFields using @dbml/core.
 * Throws if the DBML is invalid.
 */
export function parseDbmlToERD(dbml: string): ERDFields {
  const db = Parser.parse(dbml, "dbml");
  const schema = db.schemas[0];
  if (!schema) throw new Error("No schema found in DBML.");

  const entities = schema.tables.map((table) => {
    const attributes: ERDAttribute[] = table.fields.map((field) => ({
      name: field.name,
      type: (field.type?.type_name ?? "VARCHAR").toUpperCase(),
      isPrimaryKey: !!field.pk,
      isForeignKey: false, // resolved from refs below
      isUnique: !!field.unique,
      isNullable: !field.not_null,
      isRequired: !!field.not_null,
      isIndex: false,
      description: "",
    }));

    return {
      id: shortId(),
      name: table.name.toUpperCase(),
      description: "",
      attributes,
    };
  });

  // Build a lookup for marking FK columns
  const entityMap = new Map(entities.map((e) => [e.name, e]));

  const relationships = schema.refs.map((ref) => {
    const [ep1, ep2] = ref.endpoints;
    const rel1 = String(ep1.relation);
    const rel2 = String(ep2.relation);

    // The "many" side holds the FK column
    const manySide = rel1 === "*" ? ep1 : ep2;
    const manyEntity = entityMap.get(manySide.tableName.toUpperCase());
    if (manyEntity && manySide.fieldNames?.[0]) {
      const fkAttr = manyEntity.attributes.find(
        (a) => a.name === manySide.fieldNames[0]
      );
      if (fkAttr) fkAttr.isForeignKey = true;
    }

    return {
      id: shortId(),
      from: ep1.tableName.toUpperCase(),
      to: ep2.tableName.toUpperCase(),
      type: mapRelationType(rel1, rel2),
      label: "",
    };
  });

  return { entities, relationships };
}
