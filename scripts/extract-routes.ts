#!/usr/bin/env bun
/**
 * Reads the Stardance OpenAPI spec and distills it down to the minimal
 * route info needed to auto-generate MCP tools (see tools/api.ts).
 * Re-run this whenever `Stardance API.json` changes.
 */

const SPEC_PATH = `${import.meta.dir}/../Stardance API.json`;
const OUTPUT_PATH = `${import.meta.dir}/../api-routes.json`;

type OpenApiParam = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string; maximum?: number };
};

type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParam[];
};

type OpenApiSpec = {
  servers?: { url: string }[];
  paths: Record<string, Record<string, OpenApiOperation>>;
};

function toSnakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

// The source spec has a stray trailing comma (`"title": "Stardance API",}`),
// which is invalid JSON — strip trailing commas before parsing.
const rawSpec = await Bun.file(SPEC_PATH).text();
const spec: OpenApiSpec = JSON.parse(rawSpec.replace(/,(\s*[}\]])/g, "$1"));
const baseUrl = spec.servers?.[0]?.url ?? "";

const routes = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, op]) => ({
    name: toSnakeCase(op.operationId ?? `${method}_${path.replace(/\W+/g, "_")}`),
    method: method.toUpperCase(),
    path,
    summary: op.summary ?? "",
    description: op.description ?? op.summary ?? "",
    tags: op.tags ?? [],
    parameters: (op.parameters ?? []).map((p) => ({
      name: p.name,
      in: p.in as "path" | "query",
      required: !!p.required,
      type: p.schema?.type ?? "string",
      maximum: p.schema?.maximum,
      description: p.description ?? "",
    })),
  }))
);

await Bun.write(OUTPUT_PATH, `${JSON.stringify({ baseUrl, routes }, null, 2)}\n`);
console.log(`Extracted ${routes.length} routes to ${OUTPUT_PATH}`);
