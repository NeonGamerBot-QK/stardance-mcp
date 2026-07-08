import { z } from "zod";
import { stardanceFetch } from "../utils.ts";
import type { Tool } from "../types.ts";

type RouteParam = {
  name: string;
  in: "path" | "query";
  required: boolean;
  type: string;
  maximum?: number;
  description?: string;
};

type Route = {
  name: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: RouteParam[];
};

type RoutesFile = { baseUrl: string; routes: Route[] };

const { baseUrl, routes }: RoutesFile = await Bun.file(
  new URL("../api-routes.json", import.meta.url)
).json();

function paramToZod(param: RouteParam): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (param.type) {
    case "integer":
      schema = param.maximum !== undefined
        ? z.coerce.number().int().max(param.maximum)
        : z.coerce.number().int();
      break;
    case "number":
      schema = z.coerce.number();
      break;
    case "boolean":
      schema = z.coerce.boolean();
      break;
    default:
      schema = z.string();
  }

  if (param.description) schema = schema.describe(param.description);
  return param.required ? schema : schema.optional();
}

/**
 * Builds a runnable MCP tool straight from an OpenAPI route definition:
 * path/query params become the input schema, and execute() fills in the
 * path template and query string before hitting the public Stardance API.
 */
function buildTool(route: Route): Tool {
  const inputSchema = Object.fromEntries(
    route.parameters.map((param) => [param.name, paramToZod(param)])
  );

  return {
    name: route.name,
    desc: route.description || route.summary,
    inputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async execute(args: Record<string, unknown>) {
      let path = route.path;
      const query = new URLSearchParams();

      for (const param of route.parameters) {
        const value = args?.[param.name];
        if (value === undefined || value === null) continue;

        if (param.in === "path") {
          path = path.replace(`{${param.name}}`, encodeURIComponent(String(value)));
        } else {
          query.set(param.name, String(value));
        }
      }

      const qs = query.toString();
      const res = await stardanceFetch(`${baseUrl}${path}${qs ? `?${qs}` : ""}`);
      return res.json();
    },
  };
}

export const apiTools: Tool[] = routes.map(buildTool);
